#include "meters.h"

#include <chrono>
#include <cstdlib>
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

struct MeterReading {
  std::string id;
  std::string username;
  double hot_water = 0.0;
  double cold_water = 0.0;
  double electricity = 0.0;
  std::string created_at;
};

std::string trim(const std::string& s) {
  const char* ws = " \t\n\r";
  const auto start = s.find_first_not_of(ws);
  if (start == std::string::npos) return std::string();
  const auto end = s.find_last_not_of(ws);
  return s.substr(start, end - start + 1);
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

json serialize_reading(const MeterReading& r) {
  json payload = {
      {"id", r.id},
      {"username", r.username},
      {"hotWater", r.hot_water},
      {"coldWater", r.cold_water},
      {"electricity", r.electricity},
      {"createdAt", r.created_at},
  };
  return payload;
}

bool fetch_readings(AppContext& ctx, std::vector<MeterReading>& out, const std::optional<std::string>& username) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;

  const char* query_all =
      "SELECT id, username, hot_water, cold_water, electricity, COALESCE(to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), '') "
      "FROM meter_readings ORDER BY created_at DESC;";

  const char* query_user =
      "SELECT id, username, hot_water, cold_water, electricity, COALESCE(to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), '') "
      "FROM meter_readings WHERE username=$1 ORDER BY created_at DESC;";

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
    MeterReading r;
    r.id = PQgetvalue(res, i, 0);
    r.username = PQgetvalue(res, i, 1);
    r.hot_water = std::strtod(PQgetvalue(res, i, 2), nullptr);
    r.cold_water = std::strtod(PQgetvalue(res, i, 3), nullptr);
    r.electricity = std::strtod(PQgetvalue(res, i, 4), nullptr);
    r.created_at = PQgetvalue(res, i, 5);
    out.push_back(std::move(r));
  }

  PQclear(res);
  PQfinish(conn);
  return true;
}

bool insert_reading(AppContext& ctx, MeterReading& r) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;

  const std::string hot = std::to_string(r.hot_water);
  const std::string cold = std::to_string(r.cold_water);
  const std::string elec = std::to_string(r.electricity);

  const char* paramValues[5];
  const int paramLengths[5] = {
      static_cast<int>(r.id.size()),
      static_cast<int>(r.username.size()),
      static_cast<int>(hot.size()),
      static_cast<int>(cold.size()),
      static_cast<int>(elec.size()),
  };
  const int paramFormats[5] = {0, 0, 0, 0, 0};

  paramValues[0] = r.id.c_str();
  paramValues[1] = r.username.c_str();
  paramValues[2] = hot.c_str();
  paramValues[3] = cold.c_str();
  paramValues[4] = elec.c_str();

  PGresult* res = PQexecParams(conn,
                               "INSERT INTO meter_readings (id, username, hot_water, cold_water, electricity) "
                               "VALUES ($1,$2,$3,$4,$5) RETURNING to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ');",
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
    r.created_at = PQgetvalue(res, 0, 0);
  }

  PQclear(res);
  PQfinish(conn);
  return true;
}

bool parse_amount(const std::string& raw, double& out) {
  try {
    out = std::stod(raw);
    return out >= 0.0;
  } catch (...) {
    return false;
  }
}

}  // namespace

void register_meter_routes(httplib::Server& server, AppContext& ctx, const std::string& base_path) {
  const std::string base = base_path.empty() ? "/api/meters" : (base_path.front() == '/' ? base_path : "/" + base_path);

  // Submit reading (authorized user)
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

    const auto get_value = [&](const std::string& key) -> std::string {
      if (!body_json.is_null() && body_json.contains(key)) {
        const auto& val = body_json.at(key);
        if (val.is_string()) return val.get<std::string>();
        if (val.is_number()) return std::to_string(val.get<double>());
      }
      if (req.has_param(key)) return req.get_param_value(key);
      return {};
    };

    double hot = 0.0, cold = 0.0, elec = 0.0;
    const std::string hot_raw = trim(get_value("hotWater"));
    const std::string cold_raw = trim(get_value("coldWater"));
    const std::string elec_raw = trim(get_value("electricity"));

    if (!parse_amount(hot_raw, hot) || !parse_amount(cold_raw, cold) || !parse_amount(elec_raw, elec)) {
      res.status = 400;
      res.set_content("Invalid meter readings", "text/plain");
      add_cors_headers(req, res, ctx);
      return;
    }

    MeterReading r;
    r.id = "meter-" + unique_id().substr(0, 12);
    r.username = claims->username;
    r.hot_water = hot;
    r.cold_water = cold;
    r.electricity = elec;

    if (!insert_reading(ctx, r)) {
      res.status = 500;
      res.set_content("Failed to save readings", "text/plain");
      add_cors_headers(req, res, ctx);
      return;
    }

    res.status = 201;
    res.set_content(serialize_reading(r).dump(), "application/json; charset=utf-8");
    add_cors_headers(req, res, ctx);
  });

  // List readings (admin or self)
  server.Get(base, [&](const httplib::Request& req, httplib::Response& res) {
    auto claims = authenticate_request(req, res, ctx, false);
    if (!claims) return;

    std::optional<std::string> username_filter;
    if (claims->role != UserRole::Admin) {
      username_filter = claims->username;
    } else if (req.has_param("username")) {
      const std::string u = trim(req.get_param_value("username"));
      if (!u.empty()) username_filter = u;
    }

    std::vector<MeterReading> rows;
    if (!fetch_readings(ctx, rows, username_filter)) {
      res.status = 500;
      res.set_content("Failed to load readings", "text/plain");
      add_cors_headers(req, res, ctx);
      return;
    }

    json body;
    body["readings"] = json::array();
    for (const auto& r : rows) body["readings"].push_back(serialize_reading(r));
    res.set_content(body.dump(), "application/json; charset=utf-8");
    add_cors_headers(req, res, ctx);
  });
}
