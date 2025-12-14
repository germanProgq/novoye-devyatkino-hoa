#include <algorithm>
#include <cstdlib>
#include <cctype>
#include <filesystem>
#include <iostream>
#include <optional>
#include <random>
#include <sstream>
#include <string>

#include "auth.h"
#include "context.h"
#include "contributions.h"
#include "db.h"
#include "documents.h"
#include "httplib.h"
#include "news.h"

namespace fs = std::filesystem;

namespace {

bool file_exists(const fs::path& p) {
  std::error_code ec;
  return fs::exists(p, ec);
}

std::string trim_copy(const std::string& value) {
  const char* ws = " \t\n\r";
  const auto start = value.find_first_not_of(ws);
  if (start == std::string::npos) return std::string();
  const auto end = value.find_last_not_of(ws);
  return value.substr(start, end - start + 1);
}

std::vector<std::string> split_and_trim(const std::string& raw) {
  std::vector<std::string> out;
  std::istringstream ss(raw);
  std::string item;
  while (std::getline(ss, item, ',')) {
    const std::string trimmed = trim_copy(item);
    if (!trimmed.empty()) out.push_back(trimmed);
  }
  return out;
}

std::optional<fs::path> resolve_documents_root(const fs::path& exec_path) {
  if (const char* env = std::getenv("HOA_DOCS_ROOT")) {
    fs::path candidate(env);
    if (file_exists(candidate / "manifest.json")) return candidate;
  }

  const fs::path exec_dir = exec_path.parent_path();
  const fs::path cwd = fs::current_path();
  const fs::path candidates[] = {
      cwd / "documents",
      exec_dir / "documents",
      exec_dir.parent_path() / "documents",
      exec_dir / ".." / "documents",
  };
  for (const auto& candidate : candidates) {
    if (file_exists(candidate / "manifest.json")) return candidate;
  }
  return std::nullopt;
}

std::string random_secret(size_t length = 64) {
  static std::mt19937_64 rng(std::random_device{}());
  static std::uniform_int_distribution<unsigned long long> dist;
  std::ostringstream oss;
  while (oss.tellp() < static_cast<std::streamoff>(length)) {
    oss << std::hex << dist(rng);
  }
  std::string out = oss.str();
  out.resize(length);
  return out;
}

bool parse_bool(const std::string& value) {
  const std::string lower = [&]() {
    std::string v = value;
    std::transform(v.begin(), v.end(), v.begin(), [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    return trim_copy(v);
  }();
  return lower == "1" || lower == "true" || lower == "yes" || lower == "on";
}

}  // namespace

int main(int argc, char** argv) {
  const fs::path exec_path = fs::absolute(argv[0]);
  auto docs_root = resolve_documents_root(exec_path);
  if (!docs_root) {
    std::cerr << "[error] Could not locate documents directory. Set HOA_DOCS_ROOT or run from backend folder.\n";
    return 1;
  }

  AppContext ctx;
  ctx.files_dir = *docs_root / "files";
  ctx.news_dir = ctx.files_dir / "news";
  if (!file_exists(ctx.files_dir)) {
    std::cerr << "[error] Documents directory is missing: " << ctx.files_dir << "\n";
    return 1;
  }

  const auto load_env = [](const char* name, const char* fallback) {
    const char* val = std::getenv(name);
    return val ? std::string(val) : std::string(fallback);
  };

  ctx.db.host = load_env("HOA_DB_HOST", "localhost");
  try {
    ctx.db.port = std::stoi(load_env("HOA_DB_PORT", "5432"));
  } catch (...) {
    ctx.db.port = 5432;
  }
  ctx.db.name = load_env("HOA_DB_NAME", "hoa");
  ctx.db.user = load_env("HOA_DB_USER", "hoa");
  ctx.db.password = load_env("HOA_DB_PASSWORD", "hoa_password");

  ctx.jwt.cookie_prefix = load_env("HOA_JWT_COOKIE_PREFIX", "hoa");
  ctx.jwt.secret = load_env("HOA_JWT_SECRET", "");
  if (ctx.jwt.secret.empty()) {
    ctx.jwt.secret = random_secret();
    std::cerr << "[warn] HOA_JWT_SECRET not set. Generated ephemeral secret; tokens will reset on restart.\n";
  }
  try {
    ctx.jwt.access_ttl = std::chrono::seconds(std::stoll(load_env("HOA_JWT_ACCESS_TTL", "900")));
  } catch (...) {
    ctx.jwt.access_ttl = std::chrono::seconds(900);
  }
  try {
    ctx.jwt.refresh_ttl = std::chrono::seconds(std::stoll(load_env("HOA_JWT_REFRESH_TTL", "604800")));
  } catch (...) {
    ctx.jwt.refresh_ttl = std::chrono::seconds(604800);
  }
  ctx.jwt.secure_cookies = parse_bool(load_env("HOA_JWT_SECURE_COOKIES", "0"));
  ctx.jwt.cookie_domain = load_env("HOA_JWT_COOKIE_DOMAIN", "");
  ctx.jwt.allowed_origins = split_and_trim(load_env("HOA_CORS_ALLOWED_ORIGINS",
                                                    "http://localhost:5173,http://localhost:4173,http://localhost:8080,http://localhost:3000"));
  if (ctx.jwt.allowed_origins.empty()) {
    ctx.jwt.allowed_origins.push_back("http://localhost:5173");
  }

  const auto normalize_name = [](std::string value) {
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    return trim_copy(value);
  };
  std::vector<AuthUser> configured_users;
  auto add_user = [&](const std::string& username, const std::string& password, UserRole role) {
    const auto norm = normalize_name(username);
    if (norm.empty() || password.empty()) return;
    for (const auto& existing : configured_users) {
      if (normalize_name(existing.username) == norm) return;
    }
    AuthUser user;
    user.username = username;
    user.password_hash = hash_password(password);
    user.role = role;
    configured_users.push_back(user);
  };

  add_user(load_env("HOA_ADMIN_USERNAME", "admin"), load_env("HOA_ADMIN_PASSWORD", "admin"), UserRole::Admin);
  add_user(load_env("HOA_USER_USERNAME", "user"), load_env("HOA_USER_PASSWORD", "user"), UserRole::User);

  // Persist configured users to DB (idempotent), then load from DB.
  bool db_users_loaded = false;
  for (const auto& u : configured_users) {
    if (!upsert_user(ctx.db, u)) {
      std::cerr << "[warn] Failed to upsert user " << u.username << " into DB\n";
    }
  }
  std::vector<AuthUser> db_users;
  if (fetch_users(ctx.db, db_users) && !db_users.empty()) {
    ctx.users = std::move(db_users);
    db_users_loaded = true;
  } else {
    ctx.users = configured_users;
  }

  if (ctx.users.empty()) {
    std::cerr << "[error] No auth users configured. Set HOA_ADMIN_USERNAME/HOA_ADMIN_PASSWORD and ensure DB is reachable.\n";
    return 1;
  }

  httplib::Server server;

  server.set_error_handler([&](const httplib::Request& req, httplib::Response& res) {
    if (res.status == 0) res.status = 404;
    add_cors_headers(req, res, ctx);
    res.set_content("Not Found", "text/plain");
  });

  server.Options(R"(.*)", [&](const httplib::Request& req, httplib::Response& res) {
    add_cors_headers(req, res, ctx);
    res.status = 204;
  });

  register_auth_routes(server, ctx, "/auth");
  // Primary documents API under /documents; keep /api/documents for backward compatibility.
  register_document_routes(server, ctx, "/documents");
  register_document_routes(server, ctx, "/api/documents");
  register_news_routes(server, ctx, "/news");
  register_news_routes(server, ctx, "/api/news");
  register_contribution_routes(server, ctx, "/contributions");
  register_contribution_routes(server, ctx, "/api/contributions");
  register_debtor_routes(server, ctx, "/debtors");
  register_debtor_routes(server, ctx, "/api/debtors");

  const int port = []() {
    if (const char* env = std::getenv("PORT")) {
      try {
        return std::stoi(env);
      } catch (...) {
      }
    }
    return 8080;
  }();

  std::cout << "[info] Documents served from " << ctx.files_dir << "\n";
  std::cout << "[info] News assets stored at " << ctx.news_dir << "\n";
  std::cout << "[info] DB host=" << ctx.db.host << " port=" << ctx.db.port << " db=" << ctx.db.name << "\n";
  std::cout << "[info] CORS allowed origins=";
  for (size_t i = 0; i < ctx.jwt.allowed_origins.size(); ++i) {
    if (i) std::cout << ",";
    std::cout << ctx.jwt.allowed_origins[i];
  }
  std::cout << "\n";
  std::cout << "[info] Starting server on http://0.0.0.0:" << port << "\n";
  server.listen("0.0.0.0", port);
  return 0;
}
