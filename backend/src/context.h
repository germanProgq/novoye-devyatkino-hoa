#pragma once

#include <filesystem>
#include <optional>
#include <string>
#include <unordered_set>

struct DbConfig {
  std::string host = "localhost";
  int port = 5432;
  std::string name = "hoa";
  std::string user = "hoa";
  std::string password = "hoa_password";
};

struct AppContext {
  std::filesystem::path files_dir;
  DbConfig db;
  std::unordered_set<std::string> hidden_ids;
};
