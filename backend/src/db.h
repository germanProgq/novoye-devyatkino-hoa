#pragma once

#include <libpq-fe.h>

#include <optional>
#include <string>

#include "context.h"

PGconn* db_connect(const DbConfig& cfg);
bool fetch_users(const DbConfig& cfg, std::vector<AuthUser>& out);
bool upsert_user(const DbConfig& cfg, const AuthUser& user);
