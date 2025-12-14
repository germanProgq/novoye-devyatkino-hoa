#include "requests.h"

#include <chrono>
#include <cctype>
#include <optional>
#include <random>
#include <sstream>
#include <string>
#include <vector>

#include "auth.h"
#include "db.h"
#include "json.hpp"

namespace {

using json = nlohmann::json;

struct RequestComment {
  std::string id;
  std::string request_id;
  std::string text;
  std::string kind;
  std::string created_at;
};

struct RequestItem {
  std::string id;
  std::string username;
  std::string title;
  std::string category;
  std::string description;
  std::string full_name;
  std::string status;
  std::string created_at;
  std::string updated_at;
  std::vector<RequestComment> comments;
};

std::string trim(const std::string& s) {
  const char* ws = " \t\n\r";
  const auto start = s.find_first_not_of(ws);
  if (start == std::string::npos) return std::string();
  const auto end = s.find_last_not_of(ws);
  return s.substr(start, end - start + 1);
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
  return trim(oss.str());
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

std::optional<std::string> parse_status(const std::string& raw) {
  std::string lower = raw;
  for (auto& ch : lower) ch = static_cast<char>(std::tolower(static_cast<unsigned char>(ch)));
  lower = trim(lower);
  if (lower == "new") return "new";
  if (lower == "in-progress" || lower == "in_progress") return "in_progress";
  if (lower == "resolved") return "resolved";
  return std::nullopt;
}

std::string parse_comment_kind(const std::string& raw) {
  std::string lower = raw;
  for (auto& ch : lower) ch = static_cast<char>(std::tolower(static_cast<unsigned char>(ch)));
  lower = trim(lower);
  if (lower == "reopen" || lower == "return" || lower == "open") return "reopen";
  return "note";
}

json serialize_comment(const RequestComment& c) {
  json payload = {
      {"id", c.id},
      {"text", c.text},
      {"kind", c.kind},
      {"createdAt", c.created_at},
  };
  return payload;
}

json serialize_request(const RequestItem& r) {
  json payload = {
      {"id", r.id},
      {"username", r.username},
      {"title", r.title},
      {"category", r.category},
      {"description", r.description},
      {"fullName", r.full_name},
      {"status", r.status},
      {"createdAt", r.created_at},
      {"updatedAt", r.updated_at},
  };
  payload["comments"] = json::array();
  for (const auto& c : r.comments) payload["comments"].push_back(serialize_comment(c));
  return payload;
}

std::string get_request_value(const httplib::Request& req, const std::string& key, const json& body_json) {
  if (!body_json.is_null() && body_json.contains(key)) {
    const auto& val = body_json.at(key);
    if (val.is_string()) return val.get<std::string>();
    if (val.is_number()) return std::to_string(val.get<double>());
  }
  if (req.has_param(key)) return req.get_param_value(key);
  auto it = req.files.find(key);
  if (it != req.files.end()) return it->second.content;
  return {};
}

bool fetch_comments_for_request(PGconn* conn, const std::string& request_id, std::vector<RequestComment>& out) {
  const char* paramValues[1] = {request_id.c_str()};
  const int paramLengths[1] = {static_cast<int>(request_id.size())};
  const int paramFormats[1] = {0};

  PGresult* res = PQexecParams(conn,
                               "SELECT id, request_id, text, kind, COALESCE(to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), '') "
                               "FROM request_comments WHERE request_id=$1 ORDER BY created_at ASC;",
                               1,
                               nullptr,
                               paramValues,
                               paramLengths,
                               paramFormats,
                               0);
  if (PQresultStatus(res) != PGRES_TUPLES_OK) {
    PQclear(res);
    return false;
  }

  const int rows = PQntuples(res);
  out.clear();
  out.reserve(rows);
  for (int i = 0; i < rows; ++i) {
    RequestComment c;
    c.id = PQgetvalue(res, i, 0);
    c.request_id = PQgetvalue(res, i, 1);
    c.text = PQgetvalue(res, i, 2);
    c.kind = PQgetvalue(res, i, 3);
    c.created_at = PQgetvalue(res, i, 4);
    out.push_back(std::move(c));
  }

  PQclear(res);
  return true;
}

bool fetch_requests(AppContext& ctx, std::vector<RequestItem>& out, const std::optional<std::string>& username) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;

  const char* query_all =
      "SELECT id, username, title, category, description, COALESCE(full_name, ''), status, "
      "COALESCE(to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), ''), "
      "COALESCE(to_char(updated_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), '') "
      "FROM requests ORDER BY updated_at DESC, created_at DESC;";

  const char* query_user =
      "SELECT id, username, title, category, description, COALESCE(full_name, ''), status, "
      "COALESCE(to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), ''), "
      "COALESCE(to_char(updated_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), '') "
      "FROM requests WHERE username=$1 ORDER BY updated_at DESC, created_at DESC;";

  PGresult* res = nullptr;
  if (username) {
    const char* paramValues[1] = {username->c_str()};
    const int paramLengths[1] = {static_cast<int>(username->size())};
    const int paramFormats[1] = {0};
    res = PQexecParams(conn, query_user, 1, nullptr, paramValues, paramLengths, paramFormats, 0);
  } else {
    res = PQexec(conn, query_all);
  }

  if (PQresultStatus(res) != PGRES_TUPLES_OK) {
    PQclear(res);
    PQfinish(conn);
    return false;
  }

  const int rows = PQntuples(res);
  out.clear();
  out.reserve(rows);
  for (int i = 0; i < rows; ++i) {
    RequestItem r;
    r.id = PQgetvalue(res, i, 0);
    r.username = PQgetvalue(res, i, 1);
    r.title = PQgetvalue(res, i, 2);
    r.category = PQgetvalue(res, i, 3);
    r.description = PQgetvalue(res, i, 4);
    r.full_name = PQgetvalue(res, i, 5);
    r.status = PQgetvalue(res, i, 6);
    r.created_at = PQgetvalue(res, i, 7);
    r.updated_at = PQgetvalue(res, i, 8);
    out.push_back(std::move(r));
  }

  PQclear(res);

  // Attach comments (small volumes, so one query per request is acceptable)
  for (auto& r : out) {
    if (!fetch_comments_for_request(conn, r.id, r.comments)) {
      PQfinish(conn);
      return false;
    }
  }

  PQfinish(conn);
  return true;
}

bool insert_request(AppContext& ctx, RequestItem& r) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;

  const char* paramValues[7];
  const int paramFormats[7] = {0, 0, 0, 0, 0, 0, 0};
  const int paramLengths[7] = {
      static_cast<int>(r.id.size()),
      static_cast<int>(r.username.size()),
      static_cast<int>(r.title.size()),
      static_cast<int>(r.category.size()),
      static_cast<int>(r.description.size()),
      static_cast<int>(r.full_name.size()),
      static_cast<int>(r.status.size()),
  };

  paramValues[0] = r.id.c_str();
  paramValues[1] = r.username.c_str();
  paramValues[2] = r.title.c_str();
  paramValues[3] = r.category.c_str();
  paramValues[4] = r.description.c_str();
  paramValues[5] = r.full_name.c_str();
  paramValues[6] = r.status.c_str();

  PGresult* res = PQexecParams(conn,
                               "INSERT INTO requests (id, username, title, category, description, full_name, status) "
                               "VALUES ($1,$2,$3,$4,$5,$6,$7) "
                               "RETURNING COALESCE(to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), ''), "
                               "COALESCE(to_char(updated_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), '');",
                               7,
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

  if (PQntuples(res) > 0) {
    r.created_at = PQgetvalue(res, 0, 0);
    r.updated_at = PQgetvalue(res, 0, 1);
  }

  PQclear(res);
  PQfinish(conn);
  return true;
}

bool update_request_status(AppContext& ctx, const std::string& id, const std::string& status, RequestItem& out, bool& not_found) {
  not_found = false;
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;

  const char* paramValues[2] = {id.c_str(), status.c_str()};
  const int paramLengths[2] = {static_cast<int>(id.size()), static_cast<int>(status.size())};
  const int paramFormats[2] = {0, 0};

  PGresult* res = PQexecParams(conn,
                               "UPDATE requests SET status=$2, updated_at=NOW() WHERE id=$1 "
                               "RETURNING id, username, title, category, description, COALESCE(full_name, ''), status, "
                               "COALESCE(to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), ''), "
                               "COALESCE(to_char(updated_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), '');",
                               2,
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
    not_found = true;
    return false;
  }

  out.id = PQgetvalue(res, 0, 0);
  out.username = PQgetvalue(res, 0, 1);
  out.title = PQgetvalue(res, 0, 2);
  out.category = PQgetvalue(res, 0, 3);
  out.description = PQgetvalue(res, 0, 4);
  out.full_name = PQgetvalue(res, 0, 5);
  out.status = PQgetvalue(res, 0, 6);
  out.created_at = PQgetvalue(res, 0, 7);
  out.updated_at = PQgetvalue(res, 0, 8);

  PQclear(res);
  if (!fetch_comments_for_request(conn, out.id, out.comments)) {
    PQfinish(conn);
    return false;
  }

  PQfinish(conn);
  return true;
}

bool append_comment(AppContext& ctx,
                    const std::string& request_id,
                    RequestComment& c,
                    const std::string& new_status,
                    bool& not_found,
                    RequestItem& out) {
  not_found = false;
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;

  const char* paramValues[5];
  const int paramFormats[5] = {0, 0, 0, 0, 0};
  const int paramLengths[5] = {
      static_cast<int>(c.id.size()),
      static_cast<int>(request_id.size()),
      static_cast<int>(c.text.size()),
      static_cast<int>(c.kind.size()),
      static_cast<int>(new_status.size()),
  };

  paramValues[0] = c.id.c_str();
  paramValues[1] = request_id.c_str();
  paramValues[2] = c.text.c_str();
  paramValues[3] = c.kind.c_str();
  paramValues[4] = new_status.c_str();

  PGresult* res = PQexecParams(conn,
                               "WITH updated AS ("
                               "  UPDATE requests SET updated_at=NOW(), status = COALESCE(NULLIF($5, ''), status) "
                               "  WHERE id=$2 "
                               "  RETURNING id, username, title, category, description, "
                               "            COALESCE(full_name, '') AS full_name, status, "
                               "            COALESCE(to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), '') AS created_at, "
                               "            COALESCE(to_char(updated_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), '') AS updated_at"
                               "), inserted AS ("
                               "  INSERT INTO request_comments (id, request_id, text, kind) "
                               "  SELECT $1, $2, $3, $4 FROM updated "
                               "  RETURNING COALESCE(to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), '') AS comment_created_at"
                               ") "
                               "SELECT u.id, u.username, u.title, u.category, u.description, u.full_name, u.status, u.created_at, u.updated_at, "
                               "       COALESCE((SELECT comment_created_at FROM inserted LIMIT 1), '') AS comment_created_at "
                               "FROM updated u;",
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

  if (PQntuples(res) == 0) {
    PQclear(res);
    PQfinish(conn);
    not_found = true;
    return false;
  }

  out.id = PQgetvalue(res, 0, 0);
  out.username = PQgetvalue(res, 0, 1);
  out.title = PQgetvalue(res, 0, 2);
  out.category = PQgetvalue(res, 0, 3);
  out.description = PQgetvalue(res, 0, 4);
  out.full_name = PQgetvalue(res, 0, 5);
  out.status = PQgetvalue(res, 0, 6);
  out.created_at = PQgetvalue(res, 0, 7);
  out.updated_at = PQgetvalue(res, 0, 8);
  c.created_at = PQgetvalue(res, 0, 9);

  PQclear(res);

  if (!fetch_comments_for_request(conn, out.id, out.comments)) {
    PQfinish(conn);
    return false;
  }

  PQfinish(conn);
  return true;
}

}  // namespace

void register_request_routes(httplib::Server& server, AppContext& ctx, const std::string& base_path) {
  const std::string base = base_path.empty() ? "/api/requests" : (base_path.front() == '/' ? base_path : "/" + base_path);

  // List requests: admin sees all, user only their own.
  server.Get(base, [&](const httplib::Request& req, httplib::Response& res) {
    auto claims = authenticate_request(req, res, ctx, false);
    if (!claims) return;

    const bool is_admin = claims->role == UserRole::Admin;
    std::vector<RequestItem> list;
    if (!fetch_requests(ctx, list, is_admin ? std::nullopt : std::make_optional(claims->username))) {
      res.status = 500;
      res.set_content("Failed to load requests", "text/plain");
      add_cors_headers(req, res, ctx);
      return;
    }

    json body;
    body["requests"] = json::array();
    for (const auto& r : list) body["requests"].push_back(serialize_request(r));
    res.set_content(body.dump(), "application/json; charset=utf-8");
    add_cors_headers(req, res, ctx);
  });

  // Submit new request (user)
  server.Post(base, [&](const httplib::Request& req, httplib::Response& res) {
    auto claims = authenticate_request(req, res, ctx, false);
    if (!claims) return;

    json body_json;
    const auto content_type = req.get_header_value("Content-Type");
    if (content_type.find("application/json") != std::string::npos) {
      try {
        body_json = json::parse(req.body);
      } catch (...) {
      }
    }

    const std::string title = normalize_spaces(get_request_value(req, "title", body_json));
    const std::string description = normalize_spaces(get_request_value(req, "description", body_json));
    std::string category = normalize_spaces(get_request_value(req, "category", body_json));
    std::string full_name = normalize_spaces(get_request_value(req, "fullName", body_json));
    if (full_name.empty()) full_name = normalize_spaces(get_request_value(req, "fio", body_json));

    if (title.empty() || description.empty()) {
      res.status = 400;
      res.set_content("Title and description are required", "text/plain");
      add_cors_headers(req, res, ctx);
      return;
    }
    if (category.empty()) category = "Общее";

    RequestItem r;
    r.id = "req-" + unique_id().substr(0, 12);
    r.username = claims->username;
    r.title = title;
    r.category = category;
    r.description = description;
    r.full_name = full_name;
    r.status = "new";

    if (!insert_request(ctx, r)) {
      res.status = 500;
      res.set_content("Failed to create request", "text/plain");
      add_cors_headers(req, res, ctx);
      return;
    }

    res.status = 201;
    json body = serialize_request(r);
    res.set_content(body.dump(), "application/json; charset=utf-8");
    add_cors_headers(req, res, ctx);
  });

  // Update status (admin)
  server.Put(base + R"(/([^/]+)/status)", [&](const httplib::Request& req, httplib::Response& res) {
    if (!authenticate_request(req, res, ctx, true)) return;

    json body_json;
    const auto content_type = req.get_header_value("Content-Type");
    if (content_type.find("application/json") != std::string::npos) {
      try {
        body_json = json::parse(req.body);
      } catch (...) {
      }
    }

    const auto status_opt = parse_status(get_request_value(req, "status", body_json));
    if (!status_opt) {
      res.status = 400;
      res.set_content("Invalid status", "text/plain");
      add_cors_headers(req, res, ctx);
      return;
    }

    RequestItem updated;
    bool not_found = false;
    if (!update_request_status(ctx, req.matches[1], *status_opt, updated, not_found)) {
      res.status = not_found ? 404 : 500;
      res.set_content(not_found ? "Request not found" : "Failed to update status", "text/plain");
      add_cors_headers(req, res, ctx);
      return;
    }

    res.set_content(serialize_request(updated).dump(), "application/json; charset=utf-8");
    add_cors_headers(req, res, ctx);
  });

  // Add admin comment (optionally re-open to in_progress)
  server.Post(base + R"(/([^/]+)/comments)", [&](const httplib::Request& req, httplib::Response& res) {
    if (!authenticate_request(req, res, ctx, true)) return;

    json body_json;
    const auto content_type = req.get_header_value("Content-Type");
    if (content_type.find("application/json") != std::string::npos) {
      try {
        body_json = json::parse(req.body);
      } catch (...) {
      }
    }

    const std::string text = normalize_spaces(get_request_value(req, "text", body_json));
    const std::string kind = parse_comment_kind(get_request_value(req, "kind", body_json));

    if (text.empty()) {
      res.status = 400;
      res.set_content("Comment text is required", "text/plain");
      add_cors_headers(req, res, ctx);
      return;
    }

    RequestComment comment;
    comment.id = "reqc-" + unique_id().substr(0, 12);
    comment.request_id = req.matches[1];
    comment.text = text;
    comment.kind = kind;

    const std::string new_status = kind == "reopen" ? "in_progress" : "";
    bool not_found = false;
    RequestItem updated;
    if (!append_comment(ctx, comment.request_id, comment, new_status, not_found, updated)) {
      res.status = not_found ? 404 : 500;
      res.set_content(not_found ? "Request not found" : "Failed to add comment", "text/plain");
      add_cors_headers(req, res, ctx);
      return;
    }

    res.set_content(serialize_request(updated).dump(), "application/json; charset=utf-8");
    add_cors_headers(req, res, ctx);
  });
}
