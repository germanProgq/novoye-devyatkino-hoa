#include "accounts.h"

#include <algorithm>
#include <cctype>
#include <chrono>
#include <cstdlib>
#include <optional>
#include <random>
#include <sstream>
#include <string>
#include <unordered_map>
#include <vector>

#include "auth.h"
#include "db.h"
#include "json.hpp"

namespace {

using json = nlohmann::json;

struct AccountPersonLink {
  std::string id;
  std::string username;
  std::string display_name;
  std::string normalized_name;
  std::string apartment;
  std::vector<std::string> houses;
  std::string created_at;
  std::string updated_at;
};

struct Debtor {
  std::string id;
  std::string display_name;
  std::string normalized_name;
  std::string apartment;
  std::vector<std::string> houses;
  std::string phone;
  double debt = 0.0;
  std::string note;
  std::string updated_at;
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

std::string canonical_key(const std::string& value) {
  const std::string lower = to_lower_utf8(value);
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

std::vector<std::string> parse_pg_text_array(const std::string& raw) {
  std::vector<std::string> out;
  if (raw.empty()) return out;
  std::string current;
  bool in_quotes = false;
  for (size_t i = 0; i < raw.size(); ++i) {
    char ch = raw[i];
    if (ch == '"' && (i == 0 || raw[i - 1] != '\\')) {
      in_quotes = !in_quotes;
      continue;
    }
    if (!in_quotes && (ch == '{' || ch == '}')) continue;
    if (!in_quotes && ch == ',') {
      if (!current.empty()) out.push_back(current);
      current.clear();
      continue;
    }
    if (ch == '\\' && i + 1 < raw.size()) {
      ++i;
      ch = raw[i];
    }
    current.push_back(ch);
  }
  if (!current.empty()) out.push_back(current);
  for (auto& val : out) val = trim(val);
  out.erase(std::remove_if(out.begin(), out.end(), [](const std::string& v) { return v.empty(); }), out.end());
  return out;
}

std::string to_pg_text_array(const std::vector<std::string>& values) {
  if (values.empty()) return "{}";
  std::ostringstream oss;
  oss << "{";
  for (size_t i = 0; i < values.size(); ++i) {
    if (i > 0) oss << ",";
    oss << "\"";
    for (char ch : values[i]) {
      if (ch == '"' || ch == '\\') oss << "\\";
      oss << ch;
    }
    oss << "\"";
  }
  oss << "}";
  return oss.str();
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

std::string canonical_person_key(const std::string& raw) {
  return canonical_key(normalize_spaces(trim(raw)));
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

std::vector<std::string> get_request_array(const httplib::Request& req, const std::string& key, const json& body_json) {
  std::vector<std::string> out;
  if (!body_json.is_null() && body_json.contains(key)) {
    const auto& val = body_json.at(key);
    if (val.is_array()) {
      for (const auto& v : val) {
        if (v.is_string()) out.push_back(v.get<std::string>());
        else if (v.is_number()) out.push_back(std::to_string(v.get<double>()));
      }
    } else if (val.is_string()) {
      out.push_back(val.get<std::string>());
    } else if (val.is_number()) {
      out.push_back(std::to_string(val.get<double>()));
    }
  }
  if (out.empty() && req.has_param(key)) {
    const std::string raw = req.get_param_value(key);
    std::istringstream ss(raw);
    std::string item;
    while (std::getline(ss, item, ',')) {
      const std::string trimmed = trim(item);
      if (!trimmed.empty()) out.push_back(trimmed);
    }
  }
  return out;
}

bool fetch_account_links(AppContext& ctx, std::vector<AccountPersonLink>& out, const std::optional<std::string>& username_filter) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;

  const char* query_all =
      "SELECT id, username, COALESCE(display_name, ''), normalized_name, COALESCE(apartment, ''), COALESCE(houses, ARRAY[]::TEXT[]), "
      "COALESCE(to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), ''), COALESCE(to_char(updated_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), '') "
      "FROM account_people ORDER BY updated_at DESC;";

  const char* query_user =
      "SELECT id, username, COALESCE(display_name, ''), normalized_name, COALESCE(apartment, ''), COALESCE(houses, ARRAY[]::TEXT[]), "
      "COALESCE(to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), ''), COALESCE(to_char(updated_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), '') "
      "FROM account_people WHERE username=$1 ORDER BY updated_at DESC;";

  PGresult* res = nullptr;
  if (username_filter) {
    const char* paramValues[1] = {username_filter->c_str()};
    const int paramLengths[1] = {static_cast<int>(username_filter->size())};
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
    AccountPersonLink link;
    link.id = PQgetvalue(res, i, 0);
    link.username = PQgetvalue(res, i, 1);
    link.display_name = PQgetvalue(res, i, 2);
    link.normalized_name = PQgetvalue(res, i, 3);
    link.apartment = PQgetvalue(res, i, 4);
    link.houses = parse_pg_text_array(PQgetvalue(res, i, 5));
    link.created_at = PQgetvalue(res, i, 6);
    link.updated_at = PQgetvalue(res, i, 7);
    out.push_back(std::move(link));
  }

  PQclear(res);
  PQfinish(conn);
  return true;
}

bool upsert_account_link(AppContext& ctx, AccountPersonLink& link) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;

  const std::string houses = to_pg_text_array(link.houses);

  const char* paramValues[6];
  const int paramLengths[6] = {
      static_cast<int>(link.id.size()),
      static_cast<int>(link.username.size()),
      static_cast<int>(link.display_name.size()),
      static_cast<int>(link.normalized_name.size()),
      static_cast<int>(link.apartment.size()),
      static_cast<int>(houses.size()),
  };
  const int paramFormats[6] = {0, 0, 0, 0, 0, 0};

  paramValues[0] = link.id.c_str();
  paramValues[1] = link.username.c_str();
  paramValues[2] = link.display_name.empty() ? nullptr : link.display_name.c_str();
  paramValues[3] = link.normalized_name.c_str();
  paramValues[4] = link.apartment.empty() ? nullptr : link.apartment.c_str();
  paramValues[5] = houses.c_str();

  PGresult* res = PQexecParams(conn,
                               "INSERT INTO account_people (id, username, display_name, normalized_name, apartment, houses, updated_at) "
                               "VALUES ($1,$2,$3,$4,$5,$6,NOW()) "
                               "ON CONFLICT (normalized_name) DO UPDATE SET username=EXCLUDED.username, display_name=EXCLUDED.display_name, "
                               "apartment=EXCLUDED.apartment, houses=EXCLUDED.houses, updated_at=NOW() "
                               "RETURNING id, username, COALESCE(display_name, ''), normalized_name, COALESCE(apartment, ''), "
                               "COALESCE(houses, ARRAY[]::TEXT[]), COALESCE(to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), ''), "
                               "COALESCE(to_char(updated_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), '');",
                               6,
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
    link.id = PQgetvalue(res, 0, 0);
    link.username = PQgetvalue(res, 0, 1);
    link.display_name = PQgetvalue(res, 0, 2);
    link.normalized_name = PQgetvalue(res, 0, 3);
    link.apartment = PQgetvalue(res, 0, 4);
    link.houses = parse_pg_text_array(PQgetvalue(res, 0, 5));
    link.created_at = PQgetvalue(res, 0, 6);
    link.updated_at = PQgetvalue(res, 0, 7);
  }

  PQclear(res);
  PQfinish(conn);
  return true;
}

bool delete_account_link(AppContext& ctx, const std::string& id) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;
  const char* paramValues[1] = {id.c_str()};
  const int paramLengths[1] = {static_cast<int>(id.size())};
  const int paramFormats[1] = {0};
  PGresult* res = PQexecParams(conn, "DELETE FROM account_people WHERE id=$1;", 1, nullptr, paramValues, paramLengths, paramFormats, 0);
  const bool ok = PQresultStatus(res) == PGRES_COMMAND_OK;
  PQclear(res);
  PQfinish(conn);
  return ok;
}

bool fetch_debtors_raw(AppContext& ctx, std::vector<Debtor>& out) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;
  const char* query =
      "SELECT id, display_name, normalized_name, COALESCE(apartment, ''), COALESCE(houses, ARRAY[]::TEXT[]), COALESCE(phone, ''), debt, "
      "COALESCE(note, ''), COALESCE(to_char(updated_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), '') "
      "FROM debtors ORDER BY updated_at DESC;";
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
    Debtor d;
    d.id = PQgetvalue(res, i, 0);
    d.display_name = PQgetvalue(res, i, 1);
    d.normalized_name = PQgetvalue(res, i, 2);
    d.apartment = PQgetvalue(res, i, 3);
    d.houses = parse_pg_text_array(PQgetvalue(res, i, 4));
    d.phone = PQgetvalue(res, i, 5);
    d.debt = std::strtod(PQgetvalue(res, i, 6), nullptr);
    d.note = PQgetvalue(res, i, 7);
    d.updated_at = PQgetvalue(res, i, 8);
    out.push_back(std::move(d));
  }
  PQclear(res);
  PQfinish(conn);
  return true;
}

json serialize_link(const AccountPersonLink& link) {
  json payload = {
      {"id", link.id},
      {"username", link.username},
      {"displayName", link.display_name},
      {"normalizedName", link.normalized_name},
      {"houses", link.houses},
  };
  if (!link.apartment.empty()) payload["apartment"] = link.apartment;
  if (!link.created_at.empty()) payload["createdAt"] = link.created_at;
  if (!link.updated_at.empty()) payload["updatedAt"] = link.updated_at;
  return payload;
}

}  // namespace

void register_account_routes(httplib::Server& server, AppContext& ctx, const std::string& base_path) {
  const std::string base = base_path.empty() ? "/api/accounts" : (base_path.front() == '/' ? base_path : "/" + base_path);

  // List links (admin)
  server.Get(base + "/links", [&](const httplib::Request& req, httplib::Response& res) {
    if (!authenticate_request(req, res, ctx, true)) return;
    std::vector<AccountPersonLink> links;
    if (!fetch_account_links(ctx, links, std::nullopt)) {
      res.status = 500;
      res.set_content("Failed to load account links", "text/plain");
      add_cors_headers(req, res, ctx);
      return;
    }
    json body;
    body["links"] = json::array();
    for (const auto& link : links) body["links"].push_back(serialize_link(link));
    res.set_content(body.dump(), "application/json; charset=utf-8");
    add_cors_headers(req, res, ctx);
  });

  // Upsert link (admin)
  server.Post(base + "/links", [&](const httplib::Request& req, httplib::Response& res) {
    if (!authenticate_request(req, res, ctx, true)) return;
    json body_json;
    const auto content_type = req.get_header_value("Content-Type");
    if (content_type.find("application/json") != std::string::npos) {
      try {
        body_json = json::parse(req.body);
      } catch (...) {
      }
    }

    std::string username = trim(get_request_value(req, "username", body_json));
    std::string display = trim(get_request_value(req, "displayName", body_json));
    std::string normalized = trim(get_request_value(req, "normalizedName", body_json));
    const std::vector<std::string> houses = get_request_array(req, "houses", body_json);
    const std::string apartment = trim(get_request_value(req, "apartment", body_json));
    std::string id = trim(get_request_value(req, "id", body_json));

    if (username.empty()) {
      res.status = 400;
      res.set_content("Username is required", "text/plain");
      add_cors_headers(req, res, ctx);
      return;
    }
    if (!find_user(ctx, username)) {
      res.status = 400;
      res.set_content("User not found", "text/plain");
      add_cors_headers(req, res, ctx);
      return;
    }

    if (normalized.empty()) {
      normalized = canonical_person_key(display);
    }
    if (normalized.empty()) {
      res.status = 400;
      res.set_content("Person identifier is required", "text/plain");
      add_cors_headers(req, res, ctx);
      return;
    }

    AccountPersonLink link;
    link.id = id.empty() ? ("alink-" + unique_id().substr(0, 12)) : id;
    link.username = username;
    link.display_name = display.empty() ? normalized : display;
    link.normalized_name = normalized;
    link.apartment = apartment;
    link.houses = houses;

    if (!upsert_account_link(ctx, link)) {
      res.status = 500;
      res.set_content("Failed to save link", "text/plain");
      add_cors_headers(req, res, ctx);
      return;
    }

    res.status = 201;
    res.set_content(serialize_link(link).dump(), "application/json; charset=utf-8");
    add_cors_headers(req, res, ctx);
  });

  // Delete link (admin)
  server.Delete(base + R"(/links/([^/]+))", [&](const httplib::Request& req, httplib::Response& res) {
    if (!authenticate_request(req, res, ctx, true)) return;
    const auto& id = req.matches[1];
    if (!delete_account_link(ctx, id)) {
      res.status = 500;
      res.set_content("Failed to delete link", "text/plain");
      add_cors_headers(req, res, ctx);
      return;
    }
    res.status = 204;
    add_cors_headers(req, res, ctx);
  });

  // Debt summary for the current user
  server.Get(base + "/me/debts", [&](const httplib::Request& req, httplib::Response& res) {
    auto claims = authenticate_request(req, res, ctx, false);
    if (!claims) return;

    std::vector<AccountPersonLink> links;
    if (!fetch_account_links(ctx, links, claims->username)) {
      res.status = 500;
      res.set_content("Failed to load account links", "text/plain");
      add_cors_headers(req, res, ctx);
      return;
    }

    std::vector<Debtor> debtors;
    if (!fetch_debtors_raw(ctx, debtors)) {
      res.status = 500;
      res.set_content("Failed to load debts", "text/plain");
      add_cors_headers(req, res, ctx);
      return;
    }

    std::unordered_map<std::string, std::vector<Debtor>> debt_map;
    for (const auto& d : debtors) {
      const std::string key = canonical_person_key(d.normalized_name.empty() ? d.display_name : d.normalized_name);
      debt_map[key].push_back(d);
    }

    json payload;
    payload["username"] = claims->username;
    payload["links"] = json::array();
    double total_debt = 0.0;

    for (const auto& link : links) {
      const std::string key = canonical_person_key(link.normalized_name.empty() ? link.display_name : link.normalized_name);
      double debt_sum = 0.0;
      Debtor matched;
      bool has_match = false;

      auto it = debt_map.find(key);
      if (it != debt_map.end()) {
        for (const auto& d : it->second) {
          if (d.debt > 0) debt_sum += d.debt;
        }
        if (!it->second.empty()) {
          matched = it->second.front();  // ordered by updated_at desc
          has_match = true;
        }
      }

      total_debt += debt_sum;
      json item = serialize_link(link);
      item["debt"] = debt_sum;
      if (has_match) {
        item["debtorId"] = matched.id;
        if (!matched.note.empty()) item["note"] = matched.note;
        if (!matched.phone.empty()) item["phone"] = matched.phone;
        if (!matched.updated_at.empty()) item["updatedAt"] = matched.updated_at;
        if (!matched.apartment.empty() && !item.contains("apartment")) item["apartment"] = matched.apartment;
        if (link.houses.empty() && !matched.houses.empty()) item["houses"] = matched.houses;
      }
      payload["links"].push_back(std::move(item));
    }

    payload["totalDebt"] = total_debt;
    res.set_content(payload.dump(), "application/json; charset=utf-8");
    add_cors_headers(req, res, ctx);
  });
}
