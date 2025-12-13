#include <cstdlib>
#include <filesystem>
#include <iostream>
#include <optional>
#include <string>

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

void add_cors_headers(httplib::Response& res) {
  res.set_header("Access-Control-Allow-Origin", "*");
  res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.set_header("Access-Control-Allow-Headers", "Content-Type");
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

  httplib::Server server;

  server.set_error_handler([](const httplib::Request&, httplib::Response& res) {
    if (res.status == 0) res.status = 404;
    add_cors_headers(res);
    res.set_content("Not Found", "text/plain");
  });

  server.Options(R"(.*)", [](const httplib::Request&, httplib::Response& res) {
    add_cors_headers(res);
    res.status = 204;
  });

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
  std::cout << "[info] Starting server on http://0.0.0.0:" << port << "\n";
  server.listen("0.0.0.0", port);
  return 0;
}
