#pragma once

#include <httplib.h>

#include <string>

#include "context.h"

// Registers account-related routes (link people to auth users, fetch personal debt summary).
// Example base path: "/api/accounts".
void register_account_routes(httplib::Server& server, AppContext& ctx, const std::string& base_path);
