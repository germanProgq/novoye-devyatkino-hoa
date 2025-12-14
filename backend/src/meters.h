#pragma once

#include <httplib.h>

#include <string>

#include "context.h"

// Registers routes for meter readings (submit + list).
void register_meter_routes(httplib::Server& server, AppContext& ctx, const std::string& base_path);
