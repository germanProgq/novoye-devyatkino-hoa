#pragma once

#include <optional>
#include <string>

#include "context.h"
#include "httplib.h"

struct AuthTokens {
  std::string access;
  std::string refresh;
};

struct AuthClaims {
  std::string username;
  UserRole role = UserRole::User;
  std::string token_type;
  std::chrono::system_clock::time_point expires_at;
};

std::string role_to_string(UserRole role);
std::optional<UserRole> role_from_string(const std::string& value);
std::optional<AuthUser> find_user(const AppContext& ctx, const std::string& username);
bool verify_password(const AuthUser& user, const std::string& password);
std::string hash_password(const std::string& password);

std::string base64url_encode(const std::string& data);
std::optional<std::string> base64url_decode(const std::string& input);

AuthTokens issue_tokens(const AuthUser& user, const JwtConfig& cfg);
std::optional<AuthClaims> decode_jwt(const std::string& token, const JwtConfig& cfg);

std::optional<std::string> extract_bearer_token(const httplib::Request& req);
std::optional<std::string> extract_token_from_cookies(const httplib::Request& req, const std::string& name);

std::string resolve_cors_origin(const httplib::Request& req, const JwtConfig& cfg);
void add_cors_headers(const httplib::Request& req, httplib::Response& res, const AppContext& ctx);

void set_auth_cookies(const AuthTokens& tokens, const JwtConfig& cfg, httplib::Response& res);
void clear_auth_cookies(const JwtConfig& cfg, httplib::Response& res);

std::optional<AuthClaims> authenticate_request(const httplib::Request& req, httplib::Response& res, const AppContext& ctx, bool admin_only);
void register_auth_routes(httplib::Server& server, AppContext& ctx, const std::string& base_path);
