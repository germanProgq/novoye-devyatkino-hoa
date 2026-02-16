#include "db.h"

#include <iostream>
#include <string>
#include <vector>

#include "auth.h"

PGconn* db_connect(const DbConfig& cfg) {
  const std::string port = std::to_string(cfg.port);
  const char* keywords[] = {"host", "port", "dbname", "user", "password", nullptr};
  const char* values[] = {cfg.host.c_str(), port.c_str(), cfg.name.c_str(), cfg.user.c_str(), cfg.password.c_str(), nullptr};

  PGconn* conn = PQconnectdbParams(keywords, values, 0);
  if (PQstatus(conn) != CONNECTION_OK) {
    std::cerr << "[warn] PostgreSQL connection failed for host=" << cfg.host
              << " port=" << cfg.port << " db=" << cfg.name << " user=" << cfg.user
              << " message=" << PQerrorMessage(conn);
    PQfinish(conn);
    return nullptr;
  }
  PQsetClientEncoding(conn, "UTF8");
  return conn;
}

bool fetch_users(const DbConfig& cfg, std::vector<AuthUser>& out) {
  PGconn* conn = db_connect(cfg);
  if (!conn) return false;
  PGresult* res = PQexec(conn, "SELECT username, password_hash, role FROM users;");
  if (PQresultStatus(res) != PGRES_TUPLES_OK) {
    PQclear(res);
    PQfinish(conn);
    return false;
  }
  const int rows = PQntuples(res);
  out.clear();
  out.reserve(rows);
  for (int i = 0; i < rows; ++i) {
    AuthUser user;
    user.username = PQgetvalue(res, i, 0);
    user.password_hash = PQgetvalue(res, i, 1);
    const std::string role_raw = PQgetvalue(res, i, 2);
    user.role = role_from_string(role_raw).value_or(UserRole::User);
    out.push_back(user);
  }
  PQclear(res);
  PQfinish(conn);
  return true;
}

bool upsert_user(const DbConfig& cfg, const AuthUser& user) {
  PGconn* conn = db_connect(cfg);
  if (!conn) return false;
  const std::string role_str = role_to_string(user.role);

  const char* paramValues[3];
  int paramLengths[3] = {0, 0, 0};
  const int paramFormats[3] = {0, 0, 0};

  paramValues[0] = user.username.c_str();
  paramLengths[0] = static_cast<int>(user.username.size());

  paramValues[1] = user.password_hash.c_str();
  paramLengths[1] = static_cast<int>(user.password_hash.size());

  paramValues[2] = role_str.c_str();
  paramLengths[2] = static_cast<int>(role_str.size());

  PGresult* res = PQexecParams(conn,
                               "INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) "
                               "ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role;",
                               3,
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

bool delete_user(const DbConfig& cfg, const std::string& username) {
  PGconn* conn = db_connect(cfg);
  if (!conn) return false;

  const char* paramValues[1] = {username.c_str()};
  const int paramLengths[1] = {static_cast<int>(username.size())};
  const int paramFormats[1] = {0};

  PGresult* res = PQexecParams(conn,
                               "DELETE FROM users WHERE username=$1;",
                               1,
                               nullptr,
                               paramValues,
                               paramLengths,
                               paramFormats,
                               0);

  const auto status = PQresultStatus(res);
  const bool ok = status == PGRES_COMMAND_OK || status == PGRES_TUPLES_OK;
  PQclear(res);
  PQfinish(conn);
  return ok;
}
