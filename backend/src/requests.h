#pragma once

#include <httplib.h>

#include <string>

#include "context.h"

// Registers routes for resident requests/tickets. Authenticated users can submit,
// admins can update statuses and leave comments.
void register_request_routes(httplib::Server& server, AppContext& ctx, const std::string& base_path);
