#pragma once

#include <httplib.h>

#include <string>

#include "context.h"

struct NewsItem {
  std::string id;
  std::string title;
  std::string summary;
  std::string tag;
  std::string image_filename;
  std::string created_at;
};

void register_news_routes(httplib::Server& server, AppContext& ctx, const std::string& base_path);
