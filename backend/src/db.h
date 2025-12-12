#pragma once

#include <libpq-fe.h>

#include <optional>
#include <string>

#include "context.h"

PGconn* db_connect(const DbConfig& cfg);
