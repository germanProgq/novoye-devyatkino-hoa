#include "db.h"

#include <sstream>

PGconn* db_connect(const DbConfig& cfg) {
  std::ostringstream ss;
  ss << "host=" << cfg.host << " port=" << cfg.port << " dbname=" << cfg.name
     << " user=" << cfg.user << " password=" << cfg.password;
  PGconn* conn = PQconnectdb(ss.str().c_str());
  if (PQstatus(conn) != CONNECTION_OK) {
    PQfinish(conn);
    return nullptr;
  }
  PQsetClientEncoding(conn, "UTF8");
  return conn;
}
