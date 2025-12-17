#include "auth.h"

#include <algorithm>
#include <cctype>
#include <chrono>
#include <iomanip>
#include <optional>
#include <random>
#include <sstream>
#include <string>
#include <utility>
#include <vector>

#include <openssl/evp.h>
#include <openssl/hmac.h>

#include "db.h"
#include "json.hpp"

using json = nlohmann::json;

namespace {

std::string to_lower(const std::string& value) {
  std::string out = value;
  std::transform(out.begin(), out.end(), out.begin(), [](unsigned char c) { return static_cast<char>(std::tolower(c)); });
  return out;
}

std::string trim(const std::string& value) {
  const char* ws = " \t\n\r";
  const auto start = value.find_first_not_of(ws);
  if (start == std::string::npos) return std::string();
  const auto end = value.find_last_not_of(ws);
  return value.substr(start, end - start + 1);
}

std::string normalize_spaces(const std::string& s) {
  std::ostringstream oss;
  bool prev_space = false;
  for (char ch : s) {
    if (std::isspace(static_cast<unsigned char>(ch))) {
      if (!prev_space) oss << ' ';
      prev_space = true;
    } else {
      oss << ch;
      prev_space = false;
    }
  }
  return trim(oss.str());
}

bool decode_utf8(const std::string& input, size_t& i, uint32_t& cp) {
  unsigned char c = static_cast<unsigned char>(input[i]);
  if (c < 0x80) {
    cp = c;
    ++i;
    return true;
  }
  if ((c >> 5) == 0x6 && i + 1 < input.size()) {
    cp = ((c & 0x1F) << 6) | (static_cast<unsigned char>(input[i + 1]) & 0x3F);
    i += 2;
    return true;
  }
  if ((c >> 4) == 0xE && i + 2 < input.size()) {
    cp = ((c & 0x0F) << 12) | ((static_cast<unsigned char>(input[i + 1]) & 0x3F) << 6) |
         (static_cast<unsigned char>(input[i + 2]) & 0x3F);
    i += 3;
    return true;
  }
  if ((c >> 3) == 0x1E && i + 3 < input.size()) {
    cp = ((c & 0x07) << 18) | ((static_cast<unsigned char>(input[i + 1]) & 0x3F) << 12) |
         ((static_cast<unsigned char>(input[i + 2]) & 0x3F) << 6) | (static_cast<unsigned char>(input[i + 3]) & 0x3F);
    i += 4;
    return true;
  }
  ++i;
  return false;
}

void encode_utf8(uint32_t cp, std::string& out) {
  if (cp <= 0x7F) {
    out.push_back(static_cast<char>(cp));
  } else if (cp <= 0x7FF) {
    out.push_back(static_cast<char>(0xC0 | ((cp >> 6) & 0x1F)));
    out.push_back(static_cast<char>(0x80 | (cp & 0x3F)));
  } else if (cp <= 0xFFFF) {
    out.push_back(static_cast<char>(0xE0 | ((cp >> 12) & 0x0F)));
    out.push_back(static_cast<char>(0x80 | ((cp >> 6) & 0x3F)));
    out.push_back(static_cast<char>(0x80 | (cp & 0x3F)));
  } else {
    out.push_back(static_cast<char>(0xF0 | ((cp >> 18) & 0x07)));
    out.push_back(static_cast<char>(0x80 | ((cp >> 12) & 0x3F)));
    out.push_back(static_cast<char>(0x80 | ((cp >> 6) & 0x3F)));
    out.push_back(static_cast<char>(0x80 | (cp & 0x3F)));
  }
}

uint32_t to_lower_codepoint(uint32_t cp) {
  if (cp >= 0x410 && cp <= 0x42F) return cp + 0x20;  // А-Я
  if (cp == 0x401) return 0x451;                     // Ё
  if (cp >= 'A' && cp <= 'Z') return cp + 32;
  return cp;
}

std::string to_lower_utf8(const std::string& input) {
  std::string out;
  size_t i = 0;
  while (i < input.size()) {
    uint32_t cp = 0;
    if (!decode_utf8(input, i, cp)) continue;
    encode_utf8(to_lower_codepoint(cp), out);
  }
  return out;
}

std::string canonical_person_key(const std::string& raw) {
  const std::string normalized = normalize_spaces(trim(raw));
  const std::string lower = to_lower_utf8(normalized);
  std::string out;
  for (size_t i = 0; i < lower.size();) {
    uint32_t cp = 0;
    if (!decode_utf8(lower, i, cp)) continue;
    if (cp == 0x401 || cp == 0x451) cp = 0x435;  // Ё/ё -> Е/е
    if (std::isalnum(static_cast<unsigned char>(cp)) || cp > 127) {
      encode_utf8(cp, out);
    }
  }
  return out;
}

std::string canonical_house(const std::string& raw) {
  const std::string lower = to_lower_utf8(normalize_spaces(trim(raw)));
  std::string out;
  for (size_t i = 0; i < lower.size();) {
    uint32_t cp = 0;
    if (!decode_utf8(lower, i, cp)) continue;
    if (std::isalnum(static_cast<unsigned char>(cp)) || cp > 127) {
      encode_utf8(cp, out);
    }
  }
  return out;
}

std::string sanitize_username_segment(const std::string& raw) {
  std::string out;
  for (char ch : raw) {
    unsigned char c = static_cast<unsigned char>(ch);
    if (std::isalnum(c)) {
      out.push_back(static_cast<char>(std::tolower(c)));
    } else if (ch == '-' || ch == '_') {
      out.push_back(ch);
    }
  }
  if (out.empty()) out = "home";
  return out;
}

std::vector<std::string> parse_pg_text_array(const std::string& raw) {
  std::vector<std::string> out;
  if (raw.empty()) return out;
  std::string current;
  bool in_quotes = false;
  for (size_t i = 0; i < raw.size(); ++i) {
    char ch = raw[i];
    if (ch == '"' && (i == 0 || raw[i - 1] != '\\')) {
      in_quotes = !in_quotes;
      continue;
    }
    if (!in_quotes && (ch == '{' || ch == '}')) continue;
    if (!in_quotes && ch == ',') {
      if (!current.empty()) out.push_back(current);
      current.clear();
      continue;
    }
    if (ch == '\\' && i + 1 < raw.size()) {
      ++i;
      ch = raw[i];
    }
    current.push_back(ch);
  }
  if (!current.empty()) out.push_back(current);
  for (auto& val : out) val = trim(val);
  out.erase(std::remove_if(out.begin(), out.end(), [](const std::string& v) { return v.empty(); }), out.end());
  return out;
}

std::string to_pg_text_array(const std::vector<std::string>& values) {
  if (values.empty()) return "{}";
  std::ostringstream oss;
  oss << "{";
  for (size_t i = 0; i < values.size(); ++i) {
    if (i > 0) oss << ",";
    oss << "\"";
    for (char ch : values[i]) {
      if (ch == '"' || ch == '\\') oss << "\\";
      oss << ch;
    }
    oss << "\"";
  }
  oss << "}";
  return oss.str();
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

std::string same_site_to_string(SameSitePolicy policy) {
  switch (policy) {
    case SameSitePolicy::Strict: return "Strict";
    case SameSitePolicy::None: return "None";
    case SameSitePolicy::Lax:
    default: return "Lax";
  }
}

std::string build_cookie(const std::string& name, const std::string& value, const JwtConfig& cfg, std::chrono::seconds max_age) {
  std::ostringstream oss;
  const bool use_secure = cfg.secure_cookies || cfg.same_site == SameSitePolicy::None;
  oss << name << "=" << value << "; Path=/; SameSite=" << same_site_to_string(cfg.same_site);
  if (use_secure) oss << "; Secure";
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

struct ResidentRecord {
  std::string display_name;
  std::string normalized_name;
  std::string apartment;
  std::vector<std::string> houses;
};

std::string generate_resident_username(const std::string& normalized_name, const std::string& canonical_house) {
  const std::string house_segment = sanitize_username_segment(canonical_house);
  const std::string seed = normalized_name + "|" + canonical_house;
  std::string hash = sha256(seed);
  if (hash.size() < 8) hash = random_id(12);
  return "res-" + house_segment + "-" + hash.substr(0, 6);
}

std::string generate_resident_password() {
  return random_id(12);
}

void update_cached_user(AppContext& ctx, const AuthUser& user) {
  const auto target = to_lower(user.username);
  for (auto& existing : ctx.users) {
    if (to_lower(existing.username) == target) {
      existing = user;
      return;
    }
  }
  ctx.users.push_back(user);
}

bool ensure_resident_user(AppContext& ctx, const std::string& username, const std::string& password_plain, AuthUser& out_user) {
  AuthUser user;
  user.username = username;
  user.password_hash = hash_password(password_plain);
  user.role = UserRole::User;
  if (!upsert_user(ctx.db, user)) return false;
  update_cached_user(ctx, user);
  out_user = user;
  return true;
}

bool upsert_account_person_link(AppContext& ctx, const std::string& username, const ResidentRecord& person, const std::string& house_fallback) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;

  const std::vector<std::string> houses = !person.houses.empty() ? person.houses : std::vector<std::string>{house_fallback};
  const std::string houses_array = to_pg_text_array(houses);
  const std::string link_id = "alink-" + random_id(12);
  const std::string display = person.display_name.empty() ? person.normalized_name : person.display_name;

  const char* paramValues[6];
  const int paramLengths[6] = {
      static_cast<int>(link_id.size()),
      static_cast<int>(username.size()),
      static_cast<int>(display.size()),
      static_cast<int>(person.normalized_name.size()),
      static_cast<int>(person.apartment.size()),
      static_cast<int>(houses_array.size()),
  };
  const int paramFormats[6] = {0, 0, 0, 0, 0, 0};

  paramValues[0] = link_id.c_str();
  paramValues[1] = username.c_str();
  paramValues[2] = display.empty() ? nullptr : display.c_str();
  paramValues[3] = person.normalized_name.empty() ? nullptr : person.normalized_name.c_str();
  paramValues[4] = person.apartment.empty() ? nullptr : person.apartment.c_str();
  paramValues[5] = houses_array.c_str();

  PGresult* res = PQexecParams(conn,
                               "INSERT INTO account_people (id, username, display_name, normalized_name, apartment, houses, updated_at) "
                               "VALUES ($1,$2,$3,$4,$5,$6,NOW()) "
                               "ON CONFLICT (normalized_name) DO UPDATE SET username=EXCLUDED.username, display_name=EXCLUDED.display_name, "
                               "apartment=EXCLUDED.apartment, houses=EXCLUDED.houses, updated_at=NOW();",
                               6,
                               nullptr,
                               paramValues,
                               paramLengths,
                               paramFormats,
                               0);

  const bool ok = PQresultStatus(res) == PGRES_COMMAND_OK;
  PQclear(res);
  PQfinish(conn);
  return ok;
}

bool fetch_resident_records(AppContext& ctx, const std::string& normalized_key, std::vector<ResidentRecord>& out) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;

  const char* paramValues[1] = {normalized_key.c_str()};
  const int paramLengths[1] = {static_cast<int>(normalized_key.size())};
  const int paramFormats[1] = {0};

  PGresult* res = PQexecParams(conn,
                               "SELECT display_name, normalized_name, COALESCE(apartment, ''), ARRAY[house] "
                               "FROM registration_residents WHERE normalized_name=$1 "
                               "UNION ALL "
                               "SELECT COALESCE(display_name, ''), normalized_name, COALESCE(apartment, ''), COALESCE(houses, ARRAY[]::TEXT[]) "
                               "FROM debtors WHERE normalized_name=$1 "
                               "UNION ALL "
                               "SELECT COALESCE(display_name, ''), normalized_name, COALESCE(apartment, ''), COALESCE(houses, ARRAY[]::TEXT[]) "
                               "FROM contributions WHERE normalized_name=$1;",
                               1,
                               nullptr,
                               paramValues,
                               paramLengths,
                               paramFormats,
                               0);

  if (PQresultStatus(res) != PGRES_TUPLES_OK) {
    PQclear(res);
    PQfinish(conn);
    return false;
  }

  out.clear();
  out.reserve(PQntuples(res));

  auto append_records = [&](PGresult* result, bool filter_by_key) {
    const int rows = PQntuples(result);
    for (int i = 0; i < rows; ++i) {
      ResidentRecord record;
      record.display_name = PQgetvalue(result, i, 0);
      const std::string raw_normalized = PQgetvalue(result, i, 1);
      const std::string canonicalized = canonical_person_key(raw_normalized);
      record.normalized_name = canonicalized.empty() ? normalized_key : canonicalized;
      record.apartment = PQgetvalue(result, i, 2);
      record.houses = parse_pg_text_array(PQgetvalue(result, i, 3));
      if (filter_by_key && record.normalized_name != normalized_key) continue;
      out.push_back(std::move(record));
    }
  };

  append_records(res, false);
  PQclear(res);

  if (out.empty()) {
    PGresult* fallback = PQexec(conn,
                                "SELECT display_name, normalized_name, COALESCE(apartment, ''), ARRAY[house] "
                                "FROM registration_residents "
                                "UNION ALL "
                                "SELECT COALESCE(display_name, ''), normalized_name, COALESCE(apartment, ''), COALESCE(houses, ARRAY[]::TEXT[]) "
                                "FROM debtors "
                                "UNION ALL "
                                "SELECT COALESCE(display_name, ''), normalized_name, COALESCE(apartment, ''), COALESCE(houses, ARRAY[]::TEXT[]) "
                                "FROM contributions;");
    if (PQresultStatus(fallback) != PGRES_TUPLES_OK) {
      PQclear(fallback);
      PQfinish(conn);
      return false;
    }
    append_records(fallback, true);
    PQclear(fallback);
  }

  PQfinish(conn);
  return true;
}

bool houses_match(const ResidentRecord& record, const std::string& canonical_house_value) {
  if (canonical_house_value.empty()) return false;
  for (const auto& h : record.houses) {
    if (canonical_house(h) == canonical_house_value) return true;
  }
  return false;
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

  server.Post(base + "/register", [&](const httplib::Request& req, httplib::Response& res) {
    add_cors_headers(req, res, ctx);
    json body;
    try {
      body = json::parse(req.body);
    } catch (...) {
    }

    const std::string raw_name = trim(body.value("fullName", ""));
    std::string raw_house = body.value("house", "");
    if (raw_house.empty()) raw_house = body.value("houseNumber", "");
    raw_house = trim(raw_house);

    if (raw_name.empty() || raw_house.empty()) {
      res.status = 400;
      res.set_content(R"({"error":"invalid_input","message":"ФИО и номер дома обязательны"})", "application/json; charset=utf-8");
      return;
    }

    const std::string normalized_name = canonical_person_key(raw_name);
    const std::string canonical_house_value = canonical_house(raw_house);
    if (normalized_name.empty() || canonical_house_value.empty()) {
      res.status = 400;
      res.set_content(R"({"error":"invalid_input","message":"Не удалось распознать данные, проверьте написание"})", "application/json; charset=utf-8");
      return;
    }

    std::vector<ResidentRecord> residents;
    if (!fetch_resident_records(ctx, normalized_name, residents)) {
      res.status = 500;
      res.set_content(R"({"error":"db_error","message":"Не удалось проверить данные жильца"})", "application/json; charset=utf-8");
      return;
    }
    if (residents.empty()) {
      res.status = 404;
      res.set_content(R"({"error":"resident_not_found","message":"Такой житель не найден в базе"})", "application/json; charset=utf-8");
      return;
    }

    ResidentRecord matched;
    bool has_match = false;
    for (const auto& rec : residents) {
      if (houses_match(rec, canonical_house_value)) {
        matched = rec;
        has_match = true;
        break;
      }
    }
    if (!has_match) {
      res.status = 404;
      res.set_content(R"({"error":"house_mismatch","message":"Дом не совпал с данными базы"})", "application/json; charset=utf-8");
      return;
    }

    if (matched.normalized_name.empty()) matched.normalized_name = normalized_name;
    if (matched.houses.empty()) matched.houses.push_back(raw_house);

    const std::string username = generate_resident_username(matched.normalized_name, canonical_house_value);
    const std::string password = generate_resident_password();
    AuthUser created_user;
    if (!ensure_resident_user(ctx, username, password, created_user)) {
      res.status = 500;
      res.set_content(R"({"error":"persist_error","message":"Не удалось создать учетную запись"})", "application/json; charset=utf-8");
      return;
    }

    if (!upsert_account_person_link(ctx, username, matched, raw_house)) {
      res.status = 500;
      res.set_content(R"({"error":"link_error","message":"Не удалось связать учетную запись с профилем жильца"})", "application/json; charset=utf-8");
      return;
    }

    json payload;
    payload["user"] = serialize_user(created_user);
    payload["password"] = password;
    payload["displayName"] = matched.display_name.empty() ? raw_name : matched.display_name;
    payload["house"] = raw_house;
    if (!matched.apartment.empty()) payload["apartment"] = matched.apartment;
    res.status = 201;
    res.set_content(payload.dump(), "application/json; charset=utf-8");
  });

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
