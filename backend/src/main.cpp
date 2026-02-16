#include <algorithm>
#include <cstdlib>
#include <cctype>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <optional>
#include <random>
#include <sstream>
#include <string>
#include <unordered_set>
#include <vector>

#include "auth.h"
#include "accounts.h"
#include "context.h"
#include "contributions.h"
#include "meters.h"
#include "db.h"
#include "documents.h"
#include "httplib.h"
#include "news.h"
#include "requests.h"
#include "json.hpp"

namespace fs = std::filesystem;
using json = nlohmann::json;

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

std::optional<std::string> load_required_env(const char* name) {
  const char* val = std::getenv(name);
  if (!val) return std::nullopt;
  const std::string trimmed = trim_copy(val);
  if (trimmed.empty()) return std::nullopt;
  return trimmed;
}

bool has_required_password_classes(const std::string& value) {
  bool has_upper = false;
  bool has_lower = false;
  bool has_digit = false;
  bool has_symbol = false;
  for (unsigned char c : value) {
    if (std::isupper(c)) has_upper = true;
    else if (std::islower(c)) has_lower = true;
    else if (std::isdigit(c)) has_digit = true;
    else has_symbol = true;
  }
  return has_upper && has_lower && has_digit && has_symbol;
}

bool looks_like_placeholder_secret(std::string value) {
  std::transform(value.begin(), value.end(), value.begin(), [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
  return value.find("change_me") != std::string::npos || value.find("changeme") != std::string::npos ||
         value.find("example") != std::string::npos || value.find("placeholder") != std::string::npos ||
         value.find("admin") != std::string::npos || value.find("password") != std::string::npos ||
         value == "secret";
}

bool validate_admin_password(const std::string& password, std::string& reason) {
  if (password.size() < 14) {
    reason = "must be at least 14 characters";
    return false;
  }
  if (!has_required_password_classes(password)) {
    reason = "must include upper/lowercase letters, digits, and symbols";
    return false;
  }
  if (looks_like_placeholder_secret(password)) {
    reason = "must not use placeholder/common values";
    return false;
  }
  return true;
}

bool validate_secret(const std::string& secret, size_t min_len, std::string& reason) {
  if (secret.size() < min_len) {
    std::ostringstream ss;
    ss << "must be at least " << min_len << " characters";
    reason = ss.str();
    return false;
  }
  if (looks_like_placeholder_secret(secret)) {
    reason = "must not use placeholder/common values";
    return false;
  }
  return true;
}

std::string normalize_spaces(const std::string& s) {
  std::ostringstream oss;
  bool prev_space = false;
  for (char ch : s) {
    if (std::isspace(static_cast<unsigned char>(ch))) {
      if (!prev_space) oss << ' ';
      prev_space = true;
    } else {
      oss << ch;
      prev_space = false;
    }
  }
  return trim_copy(oss.str());
}

bool decode_utf8(const std::string& input, size_t& i, uint32_t& cp) {
  unsigned char c = static_cast<unsigned char>(input[i]);
  if (c < 0x80) {
    cp = c;
    ++i;
    return true;
  }
  if ((c >> 5) == 0x6 && i + 1 < input.size()) {
    cp = ((c & 0x1F) << 6) | (static_cast<unsigned char>(input[i + 1]) & 0x3F);
    i += 2;
    return true;
  }
  if ((c >> 4) == 0xE && i + 2 < input.size()) {
    cp = ((c & 0x0F) << 12) | ((static_cast<unsigned char>(input[i + 1]) & 0x3F) << 6) |
         (static_cast<unsigned char>(input[i + 2]) & 0x3F);
    i += 3;
    return true;
  }
  if ((c >> 3) == 0x1E && i + 3 < input.size()) {
    cp = ((c & 0x07) << 18) | ((static_cast<unsigned char>(input[i + 1]) & 0x3F) << 12) |
         ((static_cast<unsigned char>(input[i + 2]) & 0x3F) << 6) | (static_cast<unsigned char>(input[i + 3]) & 0x3F);
    i += 4;
    return true;
  }
  ++i;
  return false;
}

void encode_utf8(uint32_t cp, std::string& out) {
  if (cp <= 0x7F) {
    out.push_back(static_cast<char>(cp));
  } else if (cp <= 0x7FF) {
    out.push_back(static_cast<char>(0xC0 | ((cp >> 6) & 0x1F)));
    out.push_back(static_cast<char>(0x80 | (cp & 0x3F)));
  } else if (cp <= 0xFFFF) {
    out.push_back(static_cast<char>(0xE0 | ((cp >> 12) & 0x0F)));
    out.push_back(static_cast<char>(0x80 | ((cp >> 6) & 0x3F)));
    out.push_back(static_cast<char>(0x80 | (cp & 0x3F)));
  } else {
    out.push_back(static_cast<char>(0xF0 | ((cp >> 18) & 0x07)));
    out.push_back(static_cast<char>(0x80 | ((cp >> 12) & 0x3F)));
    out.push_back(static_cast<char>(0x80 | ((cp >> 6) & 0x3F)));
    out.push_back(static_cast<char>(0x80 | (cp & 0x3F)));
  }
}

uint32_t to_lower_codepoint(uint32_t cp) {
  if (cp >= 0x410 && cp <= 0x42F) return cp + 0x20;  // А-Я
  if (cp == 0x401) return 0x451;                     // Ё
  if (cp >= 'A' && cp <= 'Z') return cp + 32;
  return cp;
}

std::string to_lower_utf8(const std::string& input) {
  std::string out;
  size_t i = 0;
  while (i < input.size()) {
    uint32_t cp = 0;
    if (!decode_utf8(input, i, cp)) continue;
    encode_utf8(to_lower_codepoint(cp), out);
  }
  return out;
}

std::string canonical_person_key(const std::string& raw) {
  const std::string normalized = normalize_spaces(trim_copy(raw));
  const std::string lower = to_lower_utf8(normalized);
  std::string out;
  for (size_t i = 0; i < lower.size();) {
    uint32_t cp = 0;
    if (!decode_utf8(lower, i, cp)) continue;
    if (cp == 0x401 || cp == 0x451) cp = 0x435;  // Ё/ё -> Е/е
    if (std::isalnum(static_cast<unsigned char>(cp)) || cp > 127) {
      encode_utf8(cp, out);
    }
  }
  return out;
}

std::string canonical_house(const std::string& raw) {
  const std::string lower = to_lower_utf8(normalize_spaces(trim_copy(raw)));
  std::string out;
  for (size_t i = 0; i < lower.size();) {
    uint32_t cp = 0;
    if (!decode_utf8(lower, i, cp)) continue;
    if (std::isalnum(static_cast<unsigned char>(cp)) || cp > 127) {
      encode_utf8(cp, out);
    }
  }
  return out;
}

std::string unique_seed_id() {
  static std::mt19937_64 rng(std::random_device{}());
  static std::uniform_int_distribution<unsigned long long> dist;
  auto now = std::chrono::steady_clock::now().time_since_epoch().count();
  unsigned long long rand_part = dist(rng);
  std::ostringstream oss;
  oss << std::hex << now << rand_part;
  return "regseed-" + oss.str().substr(0, 16);
}

bool ensure_registration_table(const DbConfig& cfg) {
  PGconn* conn = db_connect(cfg);
  if (!conn) return false;
  const char* ddl =
      "CREATE TABLE IF NOT EXISTS registration_residents ("
      "id TEXT PRIMARY KEY,"
      "display_name TEXT NOT NULL,"
      "normalized_name TEXT NOT NULL,"
      "house TEXT NOT NULL,"
      "apartment TEXT,"
      "created_at TIMESTAMPTZ NOT NULL DEFAULT NOW());"
      "CREATE INDEX IF NOT EXISTS registration_residents_norm_idx ON registration_residents (normalized_name);"
      "CREATE INDEX IF NOT EXISTS registration_residents_house_idx ON registration_residents (house);"
      "CREATE UNIQUE INDEX IF NOT EXISTS registration_residents_norm_house_idx ON registration_residents (normalized_name, house);";
  PGresult* res = PQexec(conn, ddl);
  const bool ok = PQresultStatus(res) == PGRES_COMMAND_OK;
  PQclear(res);
  PQfinish(conn);
  return ok;
}

bool ensure_account_people_phone(const DbConfig& cfg) {
  PGconn* conn = db_connect(cfg);
  if (!conn) return false;
  const char* ddl = "ALTER TABLE account_people ADD COLUMN IF NOT EXISTS phone TEXT;";
  PGresult* res = PQexec(conn, ddl);
  const bool ok = PQresultStatus(res) == PGRES_COMMAND_OK;
  PQclear(res);
  PQfinish(conn);
  return ok;
}

bool upsert_registration_resident(const DbConfig& cfg,
                                  const std::string& id,
                                  const std::string& display,
                                  const std::string& normalized,
                                  const std::string& house,
                                  const std::string& apartment) {
  PGconn* conn = db_connect(cfg);
  if (!conn) return false;

  const char* paramValues[5];
  const int paramLengths[5] = {
      static_cast<int>(id.size()),
      static_cast<int>(display.size()),
      static_cast<int>(normalized.size()),
      static_cast<int>(house.size()),
      static_cast<int>(apartment.size()),
  };
  const int paramFormats[5] = {0, 0, 0, 0, 0};

  paramValues[0] = id.c_str();
  paramValues[1] = display.c_str();
  paramValues[2] = normalized.c_str();
  paramValues[3] = house.c_str();
  paramValues[4] = apartment.empty() ? nullptr : apartment.c_str();

  PGresult* res = PQexecParams(conn,
                               "INSERT INTO registration_residents (id, display_name, normalized_name, house, apartment) "
                               "VALUES ($1,$2,$3,$4,$5) "
                               "ON CONFLICT (normalized_name, house) DO UPDATE SET display_name=EXCLUDED.display_name, apartment=EXCLUDED.apartment;",
                               5,
                               nullptr,
                               paramValues,
                               paramLengths,
                               paramFormats,
                               0);
  const bool ok = PQresultStatus(res) == PGRES_COMMAND_OK;
  PQclear(res);
  PQfinish(conn);
  return ok;
}

bool load_registration_seeds(const DbConfig& cfg, const fs::path& seed_path) {
  std::ifstream in(seed_path);
  if (!in) {
    std::cerr << "[warn] Registration seed file not found: " << seed_path << "\n";
    return false;
  }

  json data;
  try {
    in >> data;
  } catch (const std::exception& e) {
    std::cerr << "[warn] Failed to parse registration seed JSON: " << e.what() << "\n";
    return false;
  }

  if (!data.is_array()) {
    std::cerr << "[warn] Registration seed file must contain an array\n";
    return false;
  }

  int inserted = 0;
  int skipped = 0;
  for (const auto& item : data) {
    const std::string display = trim_copy(item.value("displayName", ""));
    const std::string house_raw = trim_copy(item.value("house", ""));
    const std::string apartment = trim_copy(item.value("apartment", ""));
    if (display.empty() || house_raw.empty()) {
      ++skipped;
      continue;
    }
    std::string normalized = trim_copy(item.value("normalizedName", ""));
    if (normalized.empty()) normalized = canonical_person_key(display);
    const std::string canonical_house_value = canonical_house(house_raw);
    if (normalized.empty() || canonical_house_value.empty()) {
      ++skipped;
      continue;
    }
    std::string id = trim_copy(item.value("id", ""));
    if (id.empty()) id = unique_seed_id();

    if (upsert_registration_resident(cfg, id, display, normalized, canonical_house_value, apartment)) {
      ++inserted;
    } else {
      ++skipped;
    }
  }

  std::cerr << "[info] Loaded " << inserted << " registration seeds from " << seed_path;
  if (skipped > 0) std::cerr << " (" << skipped << " skipped)";
  std::cerr << ".\n";
  return inserted > 0;
}

std::optional<fs::path> find_registration_seed(const fs::path& exec_path) {
  const fs::path exec_dir = exec_path.parent_path();
  const fs::path cwd = fs::current_path();
  const fs::path candidates[] = {
      cwd / "db" / "registration_residents_seed.json",
      cwd / "backend" / "db" / "registration_residents_seed.json",
      exec_dir / "db" / "registration_residents_seed.json",
      exec_dir.parent_path() / "db" / "registration_residents_seed.json",
  };
  for (const auto& candidate : candidates) {
    std::error_code ec;
    if (fs::exists(candidate, ec)) return candidate;
  }
  return std::nullopt;
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
  const auto db_name = load_required_env("HOA_DB_NAME");
  const auto db_user = load_required_env("HOA_DB_USER");
  const auto db_password = load_required_env("HOA_DB_PASSWORD");
  if (!db_name || !db_user || !db_password) {
    std::cerr << "[error] Missing required DB credentials. Set HOA_DB_NAME, HOA_DB_USER, HOA_DB_PASSWORD in .env\n";
    return 1;
  }
  std::string db_password_reason;
  if (!validate_secret(*db_password, 16, db_password_reason)) {
    std::cerr << "[error] HOA_DB_PASSWORD " << db_password_reason << "\n";
    return 1;
  }
  ctx.db.name = *db_name;
  ctx.db.user = *db_user;
  ctx.db.password = *db_password;

  ctx.jwt.cookie_prefix = load_env("HOA_JWT_COOKIE_PREFIX", "hoa");
  const auto jwt_secret = load_required_env("HOA_JWT_SECRET");
  if (!jwt_secret) {
    std::cerr << "[error] Missing HOA_JWT_SECRET. Set a strong value in .env\n";
    return 1;
  }
  std::string jwt_reason;
  if (!validate_secret(*jwt_secret, 32, jwt_reason)) {
    std::cerr << "[error] HOA_JWT_SECRET " << jwt_reason << "\n";
    return 1;
  }
  ctx.jwt.secret = *jwt_secret;
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
  std::string runtime_env = trim_copy(load_env("NODE_ENV", "production"));
  std::transform(runtime_env.begin(), runtime_env.end(), runtime_env.begin(), [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
  const bool is_development_env = runtime_env == "development" || runtime_env == "dev" || runtime_env == "local";
  const bool is_production_env = runtime_env.empty() || runtime_env == "production" || runtime_env == "prod";
  if (!is_development_env && !is_production_env) {
    std::cerr << "[warn] Unrecognized NODE_ENV='" << runtime_env
              << "'. Using production cookie policy (Secure + SameSite=Strict).\n";
  }
  ctx.jwt.secure_cookies = !is_development_env;
  ctx.jwt.same_site = is_development_env ? SameSitePolicy::Lax : SameSitePolicy::Strict;
  ctx.jwt.cookie_domain = load_env("HOA_JWT_COOKIE_DOMAIN", "");
  const auto cors_origins = load_required_env("HOA_CORS_ALLOWED_ORIGINS");
  if (!cors_origins) {
    std::cerr << "[error] Missing HOA_CORS_ALLOWED_ORIGINS in .env\n";
    return 1;
  }
  ctx.jwt.allowed_origins = split_and_trim(*cors_origins);
  if (ctx.jwt.allowed_origins.empty()) {
    std::cerr << "[error] HOA_CORS_ALLOWED_ORIGINS is empty after parsing\n";
    return 1;
  }

  ensure_registration_table(ctx.db);
  ensure_account_people_phone(ctx.db);

  const auto normalize_name = [](std::string value) {
    std::transform(value.begin(), value.end(), value.begin(), [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
    return trim_copy(value);
  };
  const auto admin_username = load_required_env("HOA_ADMIN_USERNAME");
  const auto admin_password = load_required_env("HOA_ADMIN_PASSWORD");
  if (!admin_username || !admin_password) {
    std::cerr << "[error] Missing HOA_ADMIN_USERNAME or HOA_ADMIN_PASSWORD in .env\n";
    return 1;
  }
  if (normalize_name(*admin_username).empty()) {
    std::cerr << "[error] HOA_ADMIN_USERNAME cannot be empty\n";
    return 1;
  }
  std::string admin_password_reason;
  if (!validate_admin_password(*admin_password, admin_password_reason)) {
    std::cerr << "[error] HOA_ADMIN_PASSWORD " << admin_password_reason << "\n";
    return 1;
  }

  AuthUser admin_user;
  admin_user.username = *admin_username;
  admin_user.password_hash = hash_password(*admin_password);
  admin_user.role = UserRole::Admin;

  // Persist admin credentials to DB (idempotent).
  if (!upsert_user(ctx.db, admin_user)) {
    std::cerr << "[warn] Failed to upsert admin user " << admin_user.username << " into DB\n";
  }

  // Remove legacy demo user from older seeds (and cascade demo-only data).
  if (normalize_name(admin_user.username) != "user") {
    if (!delete_user(ctx.db, "user")) {
      std::cerr << "[warn] Failed to cleanup legacy demo user 'user'\n";
    }
  }

  std::vector<AuthUser> db_users;
  if (fetch_users(ctx.db, db_users) && !db_users.empty()) {
    ctx.users = std::move(db_users);
  } else {
    ctx.users = {admin_user};
  }

  if (ctx.users.empty()) {
    std::cerr << "[error] No auth users configured. Ensure admin credentials are set and DB is reachable.\n";
    return 1;
  }
  const bool has_admin = std::any_of(ctx.users.begin(), ctx.users.end(), [](const AuthUser& user) {
    return user.role == UserRole::Admin;
  });
  if (!has_admin) {
    std::cerr << "[error] No admin user found after initialization.\n";
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
  register_meter_routes(server, ctx, "/meters");
  register_meter_routes(server, ctx, "/api/meters");
  register_debtor_routes(server, ctx, "/debtors");
  register_debtor_routes(server, ctx, "/api/debtors");
  register_request_routes(server, ctx, "/requests");
  register_request_routes(server, ctx, "/api/requests");
  register_account_routes(server, ctx, "/accounts");
  register_account_routes(server, ctx, "/api/accounts");

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
  const auto same_site_label = [](SameSitePolicy p) {
    switch (p) {
      case SameSitePolicy::None: return "None";
      case SameSitePolicy::Strict: return "Strict";
      case SameSitePolicy::Lax:
      default: return "Lax";
    }
  };
  std::cout << "[info] Auth cookies SameSite=" << same_site_label(ctx.jwt.same_site)
            << " Secure=" << (ctx.jwt.secure_cookies ? "on" : "off");
  if (!ctx.jwt.cookie_domain.empty()) {
    std::cout << " Domain=" << ctx.jwt.cookie_domain;
  }
  std::cout << " NODE_ENV=" << (runtime_env.empty() ? "production" : runtime_env);
  std::cout << "\n";
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
