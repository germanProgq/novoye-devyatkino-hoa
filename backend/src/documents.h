#pragma once

#include <httplib.h>

#include <filesystem>
#include <optional>
#include <string>
#include <vector>

#include "context.h"

struct Document {
  std::string id;
  std::string filename;
  std::string title;
  std::string category;
  std::string description;
  std::optional<int> year;
};

void register_document_routes(httplib::Server& server, AppContext& ctx, const std::string& base_path);
