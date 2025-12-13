#pragma once

#include <httplib.h>

#include <string>

#include "context.h"

// Registers routes under the given base path. Example: "/api/contributions".
// Adds helper endpoints for parsing resident input and returning summaries for charts.
void register_contribution_routes(httplib::Server& server, AppContext& ctx, const std::string& base_path);

// Optional debtor management endpoints (list/add/update/delete) to keep admin UI in sync.
void register_debtor_routes(httplib::Server& server, AppContext& ctx, const std::string& base_path);
