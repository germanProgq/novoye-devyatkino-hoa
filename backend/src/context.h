#pragma once

#include <filesystem>
#include <chrono>
#include <optional>
#include <string>
#include <unordered_set>
#include <vector>

struct DbConfig {
  std::string host = "localhost";
  int port = 5432;
  std::string name;
  std::string user;
  std::string password;
};

enum class UserRole { User, Admin };

enum class SameSitePolicy { Lax, None, Strict };

struct AuthUser {
  std::string username;
  std::string password_hash;
  UserRole role = UserRole::User;
};

struct JwtConfig {
  std::string secret;
  std::chrono::seconds access_ttl{900};   // 15 minutes
  std::chrono::seconds refresh_ttl{604800};  // 7 days
  bool secure_cookies = false;
  std::string cookie_domain;
  std::vector<std::string> allowed_origins;
  std::string cookie_prefix = "hoa";
  SameSitePolicy same_site = SameSitePolicy::Lax;
};

struct AppContext {
  std::filesystem::path files_dir;
  std::filesystem::path news_dir;
  DbConfig db;
  std::unordered_set<std::string> hidden_ids;
  JwtConfig jwt;
  std::vector<AuthUser> users;
};
