#include "auth.h"

#include <algorithm>
#include <cctype>
#include <chrono>
#include <iomanip>
#include <optional>
#include <random>
#include <sstream>
#include <string>

#include <openssl/evp.h>
#include <openssl/hmac.h>

#include "json.hpp"

using json = nlohmann::json;

namespace {

std::string to_lower(const std::string& value) {
  std::string out = value;
  std::transform(out.begin(), out.end(), out.begin(), [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
  return out;
}

std::string random_id(size_t length = 16) {
  static std::mt19937_64 rng(std::random_device{}());
  static std::uniform_int_distribution<unsigned long long> dist;
  std::ostringstream oss;
  while (oss.tellp() < static_cast<std::streamoff>(length)) {
    oss << std::hex << dist(rng);
  }
  std::string out = oss.str();
  out.resize(length);
  return out;
}

std::string sha256(const std::string& data) {
  unsigned char hash[EVP_MAX_MD_SIZE];
  unsigned int len = 0;
  if (!EVP_Digest(reinterpret_cast<const unsigned char*>(data.data()), data.size(), hash, &len, EVP_sha256(), nullptr)) {
    return {};
  }
  std::ostringstream oss;
  for (unsigned int i = 0; i < len; ++i) {
    oss << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(hash[i]);
  }
  return oss.str();
}

std::string hmac_sha256(const std::string& data, const std::string& key) {
  unsigned char result[EVP_MAX_MD_SIZE];
  unsigned int len = 0;
  HMAC(EVP_sha256(),
       reinterpret_cast<const unsigned char*>(key.data()),
       static_cast<int>(key.size()),
       reinterpret_cast<const unsigned char*>(data.data()),
       data.size(),
       result,
       &len);
  return std::string(reinterpret_cast<char*>(result), len);
}

std::string base64url_encode_raw(const unsigned char* data, size_t len) {
  const size_t out_len = 4 * ((len + 2) / 3);
  std::string out(out_len, '\0');
  int encoded = EVP_EncodeBlock(reinterpret_cast<unsigned char*>(&out[0]),
                                data,
                                static_cast<int>(len));
  if (encoded < 0) return {};
  out.resize(encoded);
  for (auto& ch : out) {
    if (ch == '+') ch = '-';
    if (ch == '/') ch = '_';
  }
  while (!out.empty() && out.back() == '=') out.pop_back();
  return out;
}

std::optional<std::string> base64url_decode_raw(const std::string& input) {
  std::string padded = input;
  std::replace(padded.begin(), padded.end(), '-', '+');
  std::replace(padded.begin(), padded.end(), '_', '/');
  while (padded.size() % 4 != 0) padded.push_back('=');

  const size_t out_len = 3 * padded.size() / 4;
  std::string out(out_len, '\0');
  int decoded = EVP_DecodeBlock(reinterpret_cast<unsigned char*>(&out[0]),
                                reinterpret_cast<const unsigned char*>(padded.data()),
                                static_cast<int>(padded.size()));
  if (decoded < 0) return std::nullopt;

  size_t pad = 0;
  if (!padded.empty() && padded[padded.size() - 1] == '=') ++pad;
  if (padded.size() > 1 && padded[padded.size() - 2] == '=') ++pad;
  if (decoded >= 0 && static_cast<size_t>(decoded) >= pad) {
    out.resize(static_cast<size_t>(decoded) - pad);
  } else {
    out.resize(static_cast<size_t>(std::max(0, decoded)));
  }
  return out;
}

std::string sign_jwt(const json& payload, const JwtConfig& cfg) {
  json header = {{"alg", "HS256"}, {"typ", "JWT"}};
  const std::string header_b64 = base64url_encode(header.dump());
  const std::string payload_b64 = base64url_encode(payload.dump());
  const std::string signing_input = header_b64 + "." + payload_b64;
  const std::string signature = hmac_sha256(signing_input, cfg.secret);
  const std::string signature_b64 = base64url_encode_raw(reinterpret_cast<const unsigned char*>(signature.data()), signature.size());
  return signing_input + "." + signature_b64;
}

std::optional<json> parse_jwt_payload(const std::string& token, const JwtConfig& cfg) {
  const auto first_dot = token.find('.');
  const auto second_dot = token.find('.', first_dot + 1);
  if (first_dot == std::string::npos || second_dot == std::string::npos) return std::nullopt;

  const std::string header_b64 = token.substr(0, first_dot);
  const std::string payload_b64 = token.substr(first_dot + 1, second_dot - first_dot - 1);
  const std::string signature_b64 = token.substr(second_dot + 1);

  const auto signing_input = token.substr(0, second_dot);
  const auto computed_sig_raw = hmac_sha256(signing_input, cfg.secret);
  const auto computed_sig_b64 = base64url_encode_raw(reinterpret_cast<const unsigned char*>(computed_sig_raw.data()), computed_sig_raw.size());
  if (computed_sig_b64 != signature_b64) return std::nullopt;

  const auto decoded_payload = base64url_decode_raw(payload_b64);
  if (!decoded_payload) return std::nullopt;

  try {
    return json::parse(*decoded_payload);
  } catch (...) {
    return std::nullopt;
  }
}

std::chrono::system_clock::time_point from_unix_seconds(long long seconds) {
  return std::chrono::system_clock::time_point(std::chrono::seconds(seconds));
}

long long to_unix_seconds(const std::chrono::system_clock::time_point& tp) {
  return std::chrono::duration_cast<std::chrono::seconds>(tp.time_since_epoch()).count();
}

std::string build_cookie(const std::string& name, const std::string& value, const JwtConfig& cfg, std::chrono::seconds max_age) {
  std::ostringstream oss;
  oss << name << "=" << value << "; Path=/; SameSite=Lax";
  if (cfg.secure_cookies) oss << "; Secure";
  oss << "; HttpOnly";
  if (!cfg.cookie_domain.empty()) {
    oss << "; Domain=" << cfg.cookie_domain;
  }
  if (max_age.count() >= 0) {
    oss << "; Max-Age=" << max_age.count();
  }
  return oss.str();
}

json serialize_user(const AuthClaims& claims) {
  return {
      {"username", claims.username},
      {"role", role_to_string(claims.role)},
  };
}

json serialize_user(const AuthUser& user) {
  return {
      {"username", user.username},
      {"role", role_to_string(user.role)},
  };
}

}  // namespace

std::string role_to_string(UserRole role) {
  return role == UserRole::Admin ? "admin" : "user";
}

std::optional<UserRole> role_from_string(const std::string& value) {
  const auto lower = to_lower(value);
  if (lower == "admin") return UserRole::Admin;
  if (lower == "user") return UserRole::User;
  return std::nullopt;
}

std::optional<AuthUser> find_user(const AppContext& ctx, const std::string& username) {
  const auto target = to_lower(username);
  for (const auto& user : ctx.users) {
    if (to_lower(user.username) == target) return user;
  }
  return std::nullopt;
}

bool verify_password(const AuthUser& user, const std::string& password) {
  const std::string hashed = sha256(password);
  return !hashed.empty() && hashed == user.password_hash;
}

std::string hash_password(const std::string& password) {
  return sha256(password);
}

std::string base64url_encode(const std::string& data) {
  return base64url_encode_raw(reinterpret_cast<const unsigned char*>(data.data()), data.size());
}

std::optional<std::string> base64url_decode(const std::string& input) {
  return base64url_decode_raw(input);
}

AuthTokens issue_tokens(const AuthUser& user, const JwtConfig& cfg) {
  AuthTokens tokens;
  const auto now = std::chrono::system_clock::now();
  const auto issued_at = to_unix_seconds(now);

  auto make_payload = [&](const std::chrono::seconds ttl, const std::string& type) {
    json payload = {
        {"sub", user.username},
        {"role", role_to_string(user.role)},
        {"iat", issued_at},
        {"exp", issued_at + ttl.count()},
        {"type", type},
        {"jti", random_id(20)},
    };
    return payload;
  };

  tokens.access = sign_jwt(make_payload(cfg.access_ttl, "access"), cfg);
  tokens.refresh = sign_jwt(make_payload(cfg.refresh_ttl, "refresh"), cfg);
  return tokens;
}

std::optional<AuthClaims> decode_jwt(const std::string& token, const JwtConfig& cfg) {
  const auto payload = parse_jwt_payload(token, cfg);
  if (!payload || !payload->is_object()) return std::nullopt;

  const auto now = std::chrono::system_clock::now();
  AuthClaims claims;
  claims.username = payload->value("sub", "");
  claims.token_type = payload->value("type", "");
  claims.expires_at = from_unix_seconds(payload->value("exp", 0));
  const auto role_val = payload->value("role", "user");
  claims.role = role_from_string(role_val).value_or(UserRole::User);

  if (claims.username.empty()) return std::nullopt;
  if (claims.expires_at <= now) return std::nullopt;
  if (claims.token_type.empty()) return std::nullopt;
  return claims;
}

std::optional<std::string> extract_bearer_token(const httplib::Request& req) {
  const auto auth_header = req.get_header_value("Authorization");
  if (auth_header.size() < 8) return std::nullopt;  // "Bearer x"
  const std::string prefix = "Bearer ";
  if (auth_header.compare(0, prefix.size(), prefix) != 0) return std::nullopt;
  const std::string token = auth_header.substr(prefix.size());
  if (token.empty()) return std::nullopt;
  return token;
}

std::optional<std::string> extract_token_from_cookies(const httplib::Request& req, const std::string& name) {
  const auto header = req.get_header_value("Cookie");
  if (header.empty()) return std::nullopt;
  std::istringstream stream(header);
  std::string pair;
  while (std::getline(stream, pair, ';')) {
    const auto eq = pair.find('=');
    if (eq == std::string::npos) continue;
    std::string key = pair.substr(0, eq);
    std::string value = pair.substr(eq + 1);
    key.erase(0, key.find_first_not_of(" \t"));
    key.erase(key.find_last_not_of(" \t") + 1);
    value.erase(0, value.find_first_not_of(" \t"));
    value.erase(value.find_last_not_of(" \t") + 1);
    if (key == name && !value.empty()) return value;
  }
  return std::nullopt;
}

std::string resolve_cors_origin(const httplib::Request& req, const JwtConfig& cfg) {
  const std::string origin = req.get_header_value("Origin");
  if (!origin.empty()) {
    for (const auto& allowed : cfg.allowed_origins) {
      if (origin == allowed) return origin;
      if (allowed == "*") return origin;  // wildcard allows any origin, but echo back for credentialed requests
    }
  }
  if (!cfg.allowed_origins.empty()) {
    // If no Origin header or not listed, fall back to first configured; for credentials callers should configure matching origin.
    return cfg.allowed_origins.front();
  }
  // No explicit config; allow current origin if present, otherwise wildcard.
  return origin.empty() ? "*" : origin;
}

void set_single_header(httplib::Response& res, const std::string& key, const std::string& value) {
  res.headers.erase(key);
  res.set_header(key, value);
}

void add_cors_headers(const httplib::Request& req, httplib::Response& res, const AppContext& ctx) {
  const auto origin = resolve_cors_origin(req, ctx.jwt);
  set_single_header(res, "Access-Control-Allow-Origin", origin);
  set_single_header(res, "Vary", "Origin");
  set_single_header(res, "Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  set_single_header(res, "Access-Control-Allow-Headers", "Content-Type, Authorization");
  set_single_header(res, "Access-Control-Allow-Credentials", "true");
}

void set_auth_cookies(const AuthTokens& tokens, const JwtConfig& cfg, httplib::Response& res) {
  const std::string access_name = cfg.cookie_prefix + "_access_token";
  const std::string refresh_name = cfg.cookie_prefix + "_refresh_token";
  res.set_header("Set-Cookie", build_cookie(access_name, tokens.access, cfg, cfg.access_ttl));
  res.set_header("Set-Cookie", build_cookie(refresh_name, tokens.refresh, cfg, cfg.refresh_ttl));
}

void clear_auth_cookies(const JwtConfig& cfg, httplib::Response& res) {
  const std::string access_name = cfg.cookie_prefix + "_access_token";
  const std::string refresh_name = cfg.cookie_prefix + "_refresh_token";
  res.set_header("Set-Cookie", build_cookie(access_name, "deleted", cfg, std::chrono::seconds(0)));
  res.set_header("Set-Cookie", build_cookie(refresh_name, "deleted", cfg, std::chrono::seconds(0)));
}

std::optional<AuthClaims> authenticate_request(const httplib::Request& req, httplib::Response& res, const AppContext& ctx, bool admin_only) {
  auto token = extract_bearer_token(req);
  if (!token) {
    const std::string access_name = ctx.jwt.cookie_prefix + "_access_token";
    token = extract_token_from_cookies(req, access_name);
  }
  if (!token) {
    res.status = 401;
    res.set_content(R"({"error":"missing_token"})", "application/json; charset=utf-8");
    add_cors_headers(req, res, ctx);
    return std::nullopt;
  }

  auto claims = decode_jwt(*token, ctx.jwt);
  if (!claims || claims->token_type != "access") {
    res.status = 401;
    res.set_content(R"({"error":"invalid_token"})", "application/json; charset=utf-8");
    add_cors_headers(req, res, ctx);
    return std::nullopt;
  }

  const auto user = find_user(ctx, claims->username);
  if (!user) {
    res.status = 401;
    res.set_content(R"({"error":"user_not_found"})", "application/json; charset=utf-8");
    add_cors_headers(req, res, ctx);
    return std::nullopt;
  }
  claims->role = user->role;

  if (admin_only && claims->role != UserRole::Admin) {
    res.status = 403;
    res.set_content(R"({"error":"forbidden"})", "application/json; charset=utf-8");
    add_cors_headers(req, res, ctx);
    return std::nullopt;
  }

  return claims;
}

void register_auth_routes(httplib::Server& server, AppContext& ctx, const std::string& base_path) {
  const std::string base = base_path.empty() ? "/auth" : (base_path.front() == '/' ? base_path : "/" + base_path);
  const std::string access_cookie = ctx.jwt.cookie_prefix + "_access_token";
  const std::string refresh_cookie = ctx.jwt.cookie_prefix + "_refresh_token";

  server.Post(base + "/login", [&](const httplib::Request& req, httplib::Response& res) {
    add_cors_headers(req, res, ctx);
    if (ctx.users.empty()) {
      res.status = 500;
      res.set_content(R"({"error":"auth_not_configured"})", "application/json; charset=utf-8");
      return;
    }

    json body;
    try {
      body = json::parse(req.body);
    } catch (...) {
      res.status = 400;
      res.set_content(R"({"error":"invalid_json"})", "application/json; charset=utf-8");
      return;
    }
    const std::string username = body.value("username", "");
    const std::string password = body.value("password", "");
    const auto user = find_user(ctx, username);
    if (!user || !verify_password(*user, password)) {
      res.status = 401;
      res.set_content(R"({"error":"invalid_credentials"})", "application/json; charset=utf-8");
      return;
    }

    auto tokens = issue_tokens(*user, ctx.jwt);
    set_auth_cookies(tokens, ctx.jwt, res);
    json payload;
    payload["user"] = serialize_user(*user);
    payload["accessExpiresIn"] = ctx.jwt.access_ttl.count();
    payload["refreshExpiresIn"] = ctx.jwt.refresh_ttl.count();
    res.status = 200;
    res.set_content(payload.dump(), "application/json; charset=utf-8");
  });

  server.Post(base + "/refresh", [&](const httplib::Request& req, httplib::Response& res) {
    add_cors_headers(req, res, ctx);
    auto token = extract_bearer_token(req);
    if (!token) token = extract_token_from_cookies(req, refresh_cookie);
    if (!token) {
      res.status = 401;
      res.set_content(R"({"error":"missing_token"})", "application/json; charset=utf-8");
      return;
    }
    const auto claims = decode_jwt(*token, ctx.jwt);
    if (!claims || claims->token_type != "refresh") {
      clear_auth_cookies(ctx.jwt, res);
      res.status = 401;
      res.set_content(R"({"error":"invalid_token"})", "application/json; charset=utf-8");
      return;
    }

    const auto user = find_user(ctx, claims->username);
    if (!user) {
      clear_auth_cookies(ctx.jwt, res);
      res.status = 401;
      res.set_content(R"({"error":"user_not_found"})", "application/json; charset=utf-8");
      return;
    }

    auto tokens = issue_tokens(*user, ctx.jwt);
    set_auth_cookies(tokens, ctx.jwt, res);
    json payload;
    payload["user"] = serialize_user(*user);
    payload["accessExpiresIn"] = ctx.jwt.access_ttl.count();
    payload["refreshExpiresIn"] = ctx.jwt.refresh_ttl.count();
    res.status = 200;
    res.set_content(payload.dump(), "application/json; charset=utf-8");
  });

  server.Post(base + "/logout", [&](const httplib::Request& req, httplib::Response& res) {
    add_cors_headers(req, res, ctx);
    clear_auth_cookies(ctx.jwt, res);
    res.status = 204;
  });

  server.Get(base + "/me", [&](const httplib::Request& req, httplib::Response& res) {
    const auto claims = authenticate_request(req, res, ctx, false);
    if (!claims) return;
    json payload;
    payload["user"] = serialize_user(*claims);
    const auto now = std::chrono::system_clock::now();
    const auto remaining = std::chrono::duration_cast<std::chrono::seconds>(claims->expires_at - now).count();
    payload["accessExpiresIn"] = std::max<long long>(0, remaining);
    res.status = 200;
    res.set_content(payload.dump(), "application/json; charset=utf-8");
    add_cors_headers(req, res, ctx);
  });

  server.Get(base + "/users", [&](const httplib::Request& req, httplib::Response& res) {
    if (!authenticate_request(req, res, ctx, true)) return;
    json payload;
    payload["users"] = json::array();
    for (const auto& user : ctx.users) {
      payload["users"].push_back(serialize_user(user));
    }
    res.status = 200;
    res.set_content(payload.dump(), "application/json; charset=utf-8");
    add_cors_headers(req, res, ctx);
  });
}
