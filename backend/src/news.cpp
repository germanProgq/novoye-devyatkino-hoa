#include "news.h"

#include <chrono>
#include <cctype>
#include <fstream>
#include <filesystem>
#include <random>
#include <sstream>
#include <stdexcept>
#include <string>

#include "db.h"
#include "json.hpp"

namespace fs = std::filesystem;
using json = nlohmann::json;

namespace {

bool file_exists(const fs::path& p) {
  std::error_code ec;
  return fs::exists(p, ec);
}

void add_cors_headers(httplib::Response& res) {
  res.set_header("Access-Control-Allow-Origin", "*");
  res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.set_header("Access-Control-Allow-Headers", "Content-Type");
}

std::string get_form_value(const httplib::Request& req, const std::string& name) {
  if (req.has_param(name)) {
    return req.get_param_value(name);
  }
  auto it = req.files.find(name);
  if (it != req.files.end()) {
    return it->second.content;
  }
  return {};
}

std::string trim(const std::string& s) {
  const char* ws = " \t\n\r";
  const auto start = s.find_first_not_of(ws);
  if (start == std::string::npos) return std::string();
  const auto end = s.find_last_not_of(ws);
  return s.substr(start, end - start + 1);
}

std::string normalize_tag(const std::string& raw) {
  const std::string trimmed = trim(raw);
  if (trimmed.empty()) return "Объявление";
  return trimmed;
}

bool has_form_value(const httplib::Request& req, const std::string& name) {
  return req.has_param(name) || req.files.find(name) != req.files.end();
}

std::string json_string_or_empty(const json& j, const std::string& key) {
  if (!j.contains(key)) return "";
  const auto& val = j.at(key);
  if (val.is_string()) return val.get<std::string>();
  return "";
}

std::string to_ascii_slug(const std::string& input) {
  std::string out;
  out.reserve(input.size());
  for (char c : input) {
    if (std::isalnum(static_cast<unsigned char>(c))) {
      out.push_back(static_cast<char>(std::tolower(static_cast<unsigned char>(c))));
    } else if (c == ' ' || c == '-' || c == '_' || c == '.') {
      out.push_back('-');
    }
  }
  std::string compact;
  bool last_dash = false;
  for (char c : out) {
    if (c == '-') {
      if (!last_dash) compact.push_back(c);
      last_dash = true;
    } else {
      compact.push_back(c);
      last_dash = false;
    }
  }
  while (!compact.empty() && compact.front() == '-') compact.erase(compact.begin());
  while (!compact.empty() && compact.back() == '-') compact.pop_back();
  return compact.empty() ? "news" : compact;
}

std::string unique_id() {
  static std::mt19937_64 rng(std::random_device{}());
  static std::uniform_int_distribution<unsigned long long> dist;
  auto now = std::chrono::steady_clock::now().time_since_epoch().count();
  unsigned long long rand_part = dist(rng);
  std::ostringstream oss;
  oss << std::hex << now << rand_part;
  return oss.str();
}

std::string unique_filename(const std::string& original_name) {
  fs::path p(original_name);
  const std::string ext = p.has_extension() ? p.extension().string() : ".bin";
  const std::string stem = p.has_stem() ? to_ascii_slug(p.stem().string()) : "news";
  return stem + "-" + unique_id().substr(0, 8) + ext;
}

std::string guess_image_mime(const std::string& ext) {
  std::string lower = ext;
  for (auto& ch : lower) ch = static_cast<char>(std::tolower(static_cast<unsigned char>(ch)));
  if (lower == ".png") return "image/png";
  if (lower == ".jpg" || lower == ".jpeg") return "image/jpeg";
  if (lower == ".webp") return "image/webp";
  if (lower == ".gif") return "image/gif";
  return "application/octet-stream";
}

std::string normalize_base_path(const std::string& base) {
  if (base.empty()) return "/news";
  if (base.front() == '/') return base;
  return "/" + base;
}

json serialize_news(const NewsItem& item, const std::string& base_path) {
  const std::string base = normalize_base_path(base_path);
  json payload = {
      {"id", item.id},
      {"title", item.title},
      {"summary", item.summary},
      {"tag", item.tag},
      {"createdAt", item.created_at},
  };
  if (!item.image_filename.empty()) {
    payload["imageUrl"] = base + "/" + item.id + "/image";
    payload["imageFilename"] = item.image_filename;
  }
  return payload;
}

bool fetch_news(AppContext& ctx, std::vector<NewsItem>& out) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;
  const char* query = "SELECT id, title, summary, tag, COALESCE(image_filename, ''), COALESCE(to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), '') FROM news ORDER BY created_at DESC;";
  PGresult* res = PQexec(conn, query);
  if (PQresultStatus(res) != PGRES_TUPLES_OK) {
    PQclear(res);
    PQfinish(conn);
    return false;
  }
  const int rows = PQntuples(res);
  out.clear();
  out.reserve(rows);
  for (int i = 0; i < rows; ++i) {
    NewsItem item;
    item.id = PQgetvalue(res, i, 0);
    item.title = PQgetvalue(res, i, 1);
    item.summary = PQgetvalue(res, i, 2);
    item.tag = PQgetvalue(res, i, 3);
    item.image_filename = PQgetvalue(res, i, 4);
    item.created_at = PQgetvalue(res, i, 5);
    out.push_back(std::move(item));
  }
  PQclear(res);
  PQfinish(conn);
  return true;
}

bool fetch_news_count(AppContext& ctx, int& out) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;

  PGresult* res = PQexec(conn, "SELECT COUNT(*) FROM news;");
  if (PQresultStatus(res) != PGRES_TUPLES_OK) {
    PQclear(res);
    PQfinish(conn);
    return false;
  }

  if (PQntuples(res) > 0) {
    try {
      out = std::stoi(PQgetvalue(res, 0, 0));
    } catch (...) {
      out = 0;
    }
  } else {
    out = 0;
  }

  PQclear(res);
  PQfinish(conn);
  return true;
}

bool fetch_news_item(AppContext& ctx, const std::string& id, NewsItem& out) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;
  const char* paramValues[1] = {id.c_str()};
  const int paramLengths[1] = {static_cast<int>(id.size())};
  const int paramFormats[1] = {0};

  PGresult* res = PQexecParams(conn,
                               "SELECT id, title, summary, tag, COALESCE(image_filename, ''), COALESCE(to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), '') "
                               "FROM news WHERE id=$1 LIMIT 1;",
                               1,
                               nullptr,
                               paramValues,
                               paramLengths,
                               paramFormats,
                               0);
  if (PQresultStatus(res) != PGRES_TUPLES_OK) {
    PQclear(res);
    PQfinish(conn);
    return false;
  }
  if (PQntuples(res) == 0) {
    PQclear(res);
    PQfinish(conn);
    return false;
  }

  out.id = PQgetvalue(res, 0, 0);
  out.title = PQgetvalue(res, 0, 1);
  out.summary = PQgetvalue(res, 0, 2);
  out.tag = PQgetvalue(res, 0, 3);
  out.image_filename = PQgetvalue(res, 0, 4);
  out.created_at = PQgetvalue(res, 0, 5);

  PQclear(res);
  PQfinish(conn);
  return true;
}

bool insert_news(AppContext& ctx, NewsItem& item) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;

  const char* paramValues[5];
  const int paramFormats[5] = {0, 0, 0, 0, 0};
  const int paramLengths[5] = {
      static_cast<int>(item.id.size()),
      static_cast<int>(item.title.size()),
      static_cast<int>(item.summary.size()),
      static_cast<int>(item.tag.size()),
      static_cast<int>(item.image_filename.size()),
  };

  paramValues[0] = item.id.c_str();
  paramValues[1] = item.title.c_str();
  paramValues[2] = item.summary.c_str();
  paramValues[3] = item.tag.c_str();
  paramValues[4] = item.image_filename.empty() ? nullptr : item.image_filename.c_str();

  PGresult* res = PQexecParams(conn,
                               "INSERT INTO news (id, title, summary, tag, image_filename) VALUES ($1,$2,$3,$4,$5) "
                               "RETURNING to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ');",
                               5,
                               nullptr,
                               paramValues,
                               paramLengths,
                               paramFormats,
                               0);
  if (PQresultStatus(res) != PGRES_TUPLES_OK) {
    PQclear(res);
    PQfinish(conn);
    return false;
  }

  if (PQntuples(res) > 0 && !PQgetisnull(res, 0, 0)) {
    item.created_at = PQgetvalue(res, 0, 0);
  }

  PQclear(res);
  PQfinish(conn);
  return true;
}

bool update_news(AppContext& ctx, NewsItem& item) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;

  const char* paramValues[5];
  const int paramFormats[5] = {0, 0, 0, 0, 0};
  const int paramLengths[5] = {
      static_cast<int>(item.id.size()),
      static_cast<int>(item.title.size()),
      static_cast<int>(item.summary.size()),
      static_cast<int>(item.tag.size()),
      static_cast<int>(item.image_filename.size()),
  };

  paramValues[0] = item.id.c_str();
  paramValues[1] = item.title.c_str();
  paramValues[2] = item.summary.c_str();
  paramValues[3] = item.tag.c_str();
  paramValues[4] = item.image_filename.empty() ? nullptr : item.image_filename.c_str();

  PGresult* res = PQexecParams(conn,
                               "UPDATE news SET title=$2, summary=$3, tag=$4, image_filename=$5 WHERE id=$1 "
                               "RETURNING to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ');",
                               5,
                               nullptr,
                               paramValues,
                               paramLengths,
                               paramFormats,
                               0);
  if (PQresultStatus(res) != PGRES_TUPLES_OK || PQntuples(res) == 0) {
    std::cerr << "[error] update_news failed: " << PQerrorMessage(conn) << "\n";
    PQclear(res);
    PQfinish(conn);
    return false;
  }

  if (!PQgetisnull(res, 0, 0)) {
    item.created_at = PQgetvalue(res, 0, 0);
  }

  PQclear(res);
  PQfinish(conn);
  return true;
}

bool delete_news(AppContext& ctx, const std::string& id) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;
  const char* paramValues[1] = {id.c_str()};
  const int paramLengths[1] = {static_cast<int>(id.size())};
  const int paramFormats[1] = {0};

  PGresult* res = PQexecParams(conn,
                               "DELETE FROM news WHERE id=$1;",
                               1,
                               nullptr,
                               paramValues,
                               paramLengths,
                               paramFormats,
                               0);

  if (PQresultStatus(res) != PGRES_COMMAND_OK) {
    PQclear(res);
    PQfinish(conn);
    return false;
  }

  const bool removed = std::string(PQcmdTuples(res)) != "0";
  PQclear(res);
  PQfinish(conn);
  return removed;
}

void register_single_news_routes(httplib::Server& server, AppContext& ctx, const std::string& base) {
  // Count
  server.Get(base + "/count", [&](const httplib::Request&, httplib::Response& res) {
    int total = 0;
    if (!fetch_news_count(ctx, total)) {
      res.status = 500;
      res.set_content("Failed to load news count", "text/plain");
      add_cors_headers(res);
      return;
    }

    json payload;
    payload["count"] = total;
    res.set_content(payload.dump(), "application/json; charset=utf-8");
    add_cors_headers(res);
  });

  // List
  server.Get(base, [&](const httplib::Request&, httplib::Response& res) {
    std::vector<NewsItem> items;
    if (!fetch_news(ctx, items)) {
      res.status = 500;
      res.set_content("Failed to load news", "text/plain");
      add_cors_headers(res);
      return;
    }

    json payload;
    payload["news"] = json::array();
    for (const auto& item : items) {
      payload["news"].push_back(serialize_news(item, base));
    }
    const auto total = static_cast<int>(items.size());
    payload["count"] = total;
    payload["total"] = total;
    payload["totalCount"] = total;
    payload["newsCount"] = total;

    res.set_content(payload.dump(), "application/json; charset=utf-8");
    add_cors_headers(res);
  });

  // Create
  server.Post(base, [&](const httplib::Request& req, httplib::Response& res) {
    const std::string title = trim(get_form_value(req, "title"));
    const std::string summary = trim(get_form_value(req, "summary"));
    const std::string tag = normalize_tag(get_form_value(req, "tag"));

    if (title.empty() || summary.empty()) {
      res.status = 400;
      res.set_content("Missing title or summary", "text/plain");
      add_cors_headers(res);
      return;
    }

    NewsItem item;
    item.id = "news-" + unique_id().substr(0, 12);
    item.title = title;
    item.summary = summary;
    item.tag = tag;

    std::string saved_filename;
    if (req.is_multipart_form_data() && req.has_file("image")) {
      auto file = req.get_file_value("image");
      if (!file.content.empty()) {
        saved_filename = unique_filename(file.filename.empty() ? "image" : file.filename);
        std::error_code ec;
        fs::create_directories(ctx.news_dir, ec);
        std::ofstream out(ctx.news_dir / saved_filename, std::ios::binary);
        if (!out) {
          res.status = 500;
          res.set_content("Failed to save image", "text/plain");
          add_cors_headers(res);
          return;
        }
        out.write(file.content.data(), static_cast<std::streamsize>(file.content.size()));
        out.close();
        item.image_filename = saved_filename;
      }
    }

    if (!insert_news(ctx, item)) {
      if (!item.image_filename.empty()) {
        std::error_code ec;
        fs::remove(ctx.news_dir / item.image_filename, ec);
      }
      res.status = 500;
      res.set_content("Failed to persist news", "text/plain");
      add_cors_headers(res);
      return;
    }

    res.status = 201;
    res.set_content(serialize_news(item, base).dump(), "application/json; charset=utf-8");
    add_cors_headers(res);
  });

  // Update (accept PUT or POST)
  auto handle_update = [&](const httplib::Request& req, httplib::Response& res) {
    const auto& id = req.matches[1];
    NewsItem existing;
    if (!fetch_news_item(ctx, id, existing)) {
      res.status = 404;
      res.set_content("News not found", "text/plain");
      add_cors_headers(res);
      return;
    }

    NewsItem updated = existing;

    json body_json;
    const auto content_type = req.get_header_value("Content-Type");
    if (content_type.find("application/json") != std::string::npos) {
      try {
        body_json = json::parse(req.body);
      } catch (...) {
      }
    }

    const bool has_title = (body_json.contains("title") && body_json.at("title").is_string()) || has_form_value(req, "title");
    const bool has_summary = (body_json.contains("summary") && body_json.at("summary").is_string()) || has_form_value(req, "summary");
    const bool has_tag = (body_json.contains("tag") && body_json.at("tag").is_string()) || has_form_value(req, "tag");
    const bool has_remove_image = body_json.contains("removeImage") || has_form_value(req, "removeImage");

    const std::string title = has_title ? trim(json_string_or_empty(body_json, "title").empty() ? get_form_value(req, "title") : json_string_or_empty(body_json, "title")) : "";
    const std::string summary = has_summary ? trim(json_string_or_empty(body_json, "summary").empty() ? get_form_value(req, "summary") : json_string_or_empty(body_json, "summary")) : "";
    const std::string tag = has_tag ? normalize_tag(json_string_or_empty(body_json, "tag").empty() ? get_form_value(req, "tag") : json_string_or_empty(body_json, "tag")) : "";
    const std::string remove_image_raw =
        has_remove_image ? trim(json_string_or_empty(body_json, "removeImage").empty() ? get_form_value(req, "removeImage") : json_string_or_empty(body_json, "removeImage")) : "";
    const bool remove_image = !remove_image_raw.empty() &&
                              (remove_image_raw == "1" || remove_image_raw == "true" || remove_image_raw == "on");

    if (has_title && !title.empty()) updated.title = title;
    if (has_summary && !summary.empty()) updated.summary = summary;
    if (has_tag && !tag.empty()) updated.tag = tag;
    if (remove_image) updated.image_filename.clear();

    bool uploaded_new_image = false;
    std::string new_filename = existing.image_filename;
    if (req.is_multipart_form_data() && req.has_file("image")) {
      auto file = req.get_file_value("image");
      if (!file.content.empty()) {
        new_filename = unique_filename(file.filename.empty() ? "image" : file.filename);
        std::error_code ec;
        fs::create_directories(ctx.news_dir, ec);
        std::ofstream out(ctx.news_dir / new_filename, std::ios::binary);
        if (!out) {
          res.status = 500;
          res.set_content("Failed to save image", "text/plain");
          add_cors_headers(res);
          return;
        }
        out.write(file.content.data(), static_cast<std::streamsize>(file.content.size()));
        out.close();
        uploaded_new_image = true;
        updated.image_filename = new_filename;
      }
    }

    if (!update_news(ctx, updated)) {
      if (uploaded_new_image) {
        std::error_code ec;
        fs::remove(ctx.news_dir / new_filename, ec);
      }
      res.status = 500;
      res.set_content("Failed to update news", "text/plain");
      add_cors_headers(res);
      return;
    }

    if ((remove_image || uploaded_new_image) && !existing.image_filename.empty()) {
      std::error_code ec;
      fs::remove(ctx.news_dir / existing.image_filename, ec);
    }

    res.set_content(serialize_news(updated, base).dump(), "application/json; charset=utf-8");
    add_cors_headers(res);
  };

  server.Put(base + R"(/([^/]+))", handle_update);
  server.Post(base + R"(/([^/]+))", handle_update);

  // Delete
  server.Delete(base + R"(/([^/]+))", [&](const httplib::Request& req, httplib::Response& res) {
    const auto& id = req.matches[1];
    NewsItem existing;
    if (!fetch_news_item(ctx, id, existing)) {
      res.status = 404;
      res.set_content("News not found", "text/plain");
      add_cors_headers(res);
      return;
    }

    if (!delete_news(ctx, id)) {
      res.status = 500;
      res.set_content("Failed to delete news", "text/plain");
      add_cors_headers(res);
      return;
    }

    if (!existing.image_filename.empty()) {
      std::error_code ec;
      fs::remove(ctx.news_dir / existing.image_filename, ec);
    }

    res.status = 204;
    add_cors_headers(res);
  });

  // Serve image
  server.Get(base + R"(/([^/]+)/image)", [&](const httplib::Request& req, httplib::Response& res) {
    const auto& id = req.matches[1];
    NewsItem item;
    if (!fetch_news_item(ctx, id, item) || item.image_filename.empty()) {
      res.status = 404;
      res.set_content("Image not found", "text/plain");
      add_cors_headers(res);
      return;
    }

    const fs::path file_path = ctx.news_dir / item.image_filename;
    if (!file_exists(file_path)) {
      res.status = 404;
      res.set_content("Image not found", "text/plain");
      add_cors_headers(res);
      return;
    }

    std::ifstream file(file_path, std::ios::binary);
    if (!file) {
      res.status = 500;
      res.set_content("Failed to read image", "text/plain");
      add_cors_headers(res);
      return;
    }
    std::string buffer((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
    const std::string mime = guess_image_mime(file_path.extension().string());
    res.set_content(buffer, mime.c_str());
    add_cors_headers(res);
  });
}

}  // namespace

void register_news_routes(httplib::Server& server, AppContext& ctx, const std::string& base_path) {
  register_single_news_routes(server, ctx, base_path);
}
