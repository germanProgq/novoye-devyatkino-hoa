#include "contributions.h"

#include <algorithm>
#include <cctype>
#include <chrono>
#include <cstdlib>
#include <cmath>
#include <ctime>
#include <map>
#include <optional>
#include <random>
#include <regex>
#include <set>
#include <sstream>
#include <string>
#include <unordered_map>
#include <vector>

#include "db.h"
#include "json.hpp"

namespace {

using json = nlohmann::json;

struct Contribution {
  std::string id;
  std::string person_input;
  std::string display_name;
  std::string normalized_name;
  std::string apartment;
  std::vector<std::string> houses;
  std::string month;
  double amount = 0.0;
  std::string note;
  std::string created_at;
};

struct Debtor {
  std::string id;
  std::string display_name;
  std::string normalized_name;
  std::string apartment;
  std::vector<std::string> houses;
  std::string phone;
  double debt = 0.0;
  std::string note;
  std::string updated_at;
};

struct PersonGuess {
  std::string raw_input;
  std::string display_name;
  std::string normalized_name;
  std::optional<std::string> apartment;
  std::vector<std::string> houses;
  double confidence = 0.4;
  std::string source = "ввод";
};

const std::vector<std::string> kMonthOrder = {"Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"};

void add_cors_headers(httplib::Response& res) {
  res.set_header("Access-Control-Allow-Origin", "*");
  res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.set_header("Access-Control-Allow-Headers", "Content-Type");
}

std::string trim(const std::string& s) {
  const char* ws = " \t\n\r";
  const auto start = s.find_first_not_of(ws);
  if (start == std::string::npos) return std::string();
  const auto end = s.find_last_not_of(ws);
  return s.substr(start, end - start + 1);
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
    cp = ((c & 0x0F) << 12) | ((static_cast<unsigned char>(input[i + 1]) & 0x3F) << 6) | (static_cast<unsigned char>(input[i + 2]) & 0x3F);
    i += 3;
    return true;
  }
  if ((c >> 3) == 0x1E && i + 3 < input.size()) {
    cp = ((c & 0x07) << 18) | ((static_cast<unsigned char>(input[i + 1]) & 0x3F) << 12) | ((static_cast<unsigned char>(input[i + 2]) & 0x3F) << 6) |
         (static_cast<unsigned char>(input[i + 3]) & 0x3F);
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

uint32_t to_upper_codepoint(uint32_t cp) {
  if (cp >= 0x430 && cp <= 0x44F) return cp - 0x20;  // а-я
  if (cp == 0x451) return 0x401;                     // ё
  if (cp >= 'a' && cp <= 'z') return cp - 32;
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

std::string capitalize_words(const std::string& input) {
  std::string lower = to_lower_utf8(input);
  std::string out;
  bool new_word = true;
  size_t i = 0;
  while (i < lower.size()) {
    uint32_t cp = 0;
    if (!decode_utf8(lower, i, cp)) continue;
    if (std::isspace(static_cast<unsigned char>(cp)) || cp == '-' || cp == '_') {
      new_word = true;
      encode_utf8(cp, out);
      continue;
    }
    if (new_word) {
      encode_utf8(to_upper_codepoint(cp), out);
      new_word = false;
    } else {
      encode_utf8(cp, out);
    }
  }
  return trim(out);
}

std::string normalize_person_name(const std::string& raw) {
  std::ostringstream cleaned;
  for (size_t i = 0; i < raw.size(); ++i) {
    unsigned char ch = static_cast<unsigned char>(raw[i]);
    if (std::isdigit(ch)) continue;
    if (std::ispunct(ch) && ch != '-' && ch != ' ' && ch != '_') continue;
    cleaned << raw[i];
  }
  return capitalize_words(normalize_spaces(cleaned.str()));
}

std::string canonical_key(const std::string& value) {
  const std::string lower = to_lower_utf8(value);
  std::string out;
  for (size_t i = 0; i < lower.size();) {
    uint32_t cp = 0;
    if (!decode_utf8(lower, i, cp)) continue;
    // Treat Ё/ё the same as Е/е for matching.
    if (cp == 0x401 || cp == 0x451) cp = 0x435;
    if (std::isalnum(static_cast<unsigned char>(cp)) || cp > 127) {
      encode_utf8(cp, out);
    }
  }
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

std::string canonical_house_key(const std::vector<std::string>& houses) {
  if (houses.empty()) return {};
  std::set<std::string> normalized;
  for (const auto& h : houses) {
    normalized.insert(canonical_key(normalize_spaces(h)));
  }
  std::ostringstream oss;
  bool first = true;
  for (const auto& h : normalized) {
    if (!first) oss << ';';
    oss << h;
    first = false;
  }
  return oss.str();
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

std::string unique_id() {
  static std::mt19937_64 rng(std::random_device{}());
  static std::uniform_int_distribution<unsigned long long> dist;
  auto now = std::chrono::steady_clock::now().time_since_epoch().count();
  unsigned long long rand_part = dist(rng);
  std::ostringstream oss;
  oss << std::hex << now << rand_part;
  return oss.str();
}

std::string current_month_label() {
  const auto now = std::chrono::system_clock::now();
  const std::time_t t = std::chrono::system_clock::to_time_t(now);
  const std::tm* tm = std::localtime(&t);
  const int idx = tm ? tm->tm_mon : 0;
  if (idx >= 0 && idx < static_cast<int>(kMonthOrder.size())) return kMonthOrder[idx];
  return "Мес";
}

std::vector<std::string> split_number_list(const std::string& raw) {
  std::vector<std::string> out;
  std::regex re(R"([0-9]{1,4})");
  auto begin = std::sregex_iterator(raw.begin(), raw.end(), re);
  auto end = std::sregex_iterator();
  for (auto it = begin; it != end; ++it) {
    out.push_back(it->str());
  }
  return out;
}

std::vector<std::string> unique_merge(const std::vector<std::string>& a, const std::vector<std::string>& b) {
  std::vector<std::string> out = a;
  for (const auto& item : b) {
    if (std::find(out.begin(), out.end(), item) == out.end()) {
      out.push_back(item);
    }
  }
  return out;
}

PersonGuess parse_person_input(const std::string& raw) {
  PersonGuess guess;
  guess.raw_input = trim(raw);
  if (guess.raw_input.empty()) return guess;

  const std::string lower = to_lower_utf8(guess.raw_input);

  std::vector<std::string> apt_candidates;
  std::vector<std::string> house_candidates;

  std::regex apt_re(R"((кв\.?|квартира|apt)[\s:]*([0-9]{1,4}(?:[\/,][0-9]{1,4})?))");
  std::regex house_re(R"((дом|д\.|корпус|корп\.?|корп|к\.)[\s:]*([0-9]{1,4}(?:[\/,][0-9]{1,4})?))");

  auto search_nums = [&](const std::regex& re, const std::string& source, std::vector<std::string>& target) {
    auto begin = std::sregex_iterator(source.begin(), source.end(), re);
    auto end = std::sregex_iterator();
    for (auto it = begin; it != end; ++it) {
      const std::string group = it->size() > 2 ? it->str(2) : it->str(0);
      const auto parts = split_number_list(group);
      target.insert(target.end(), parts.begin(), parts.end());
    }
  };

  search_nums(apt_re, lower, apt_candidates);
  search_nums(house_re, lower, house_candidates);

  std::vector<std::string> all_numbers = split_number_list(lower);
  if (apt_candidates.empty() && !all_numbers.empty()) {
    apt_candidates.push_back(all_numbers.front());
  }
  if (house_candidates.empty() && all_numbers.size() > 1) {
    house_candidates.insert(house_candidates.end(), all_numbers.begin() + 1, all_numbers.end());
  }

  if (!apt_candidates.empty()) guess.apartment = apt_candidates.front();
  guess.houses = unique_merge({}, house_candidates);

  std::string name_only = lower;
  name_only = std::regex_replace(name_only, apt_re, " ");
  name_only = std::regex_replace(name_only, house_re, " ");
  name_only = std::regex_replace(name_only, std::regex(R"([0-9]+)"), " ");
  name_only = std::regex_replace(name_only, std::regex(R"([,.;:|/]+)"), " ");
  name_only = normalize_spaces(name_only);

  guess.display_name = normalize_person_name(name_only.empty() ? guess.raw_input : name_only);
  guess.normalized_name = canonical_key(guess.display_name);
  guess.confidence = 0.4;
  if (!guess.display_name.empty()) guess.confidence += 0.2;
  if (guess.apartment) guess.confidence += 0.2;
  if (!guess.houses.empty()) guess.confidence += 0.2;
  if (guess.confidence > 0.95) guess.confidence = 0.95;
  guess.source = "ввод";
  return guess;
}

json person_guess_json(const PersonGuess& guess) {
  json j;
  j["rawInput"] = guess.raw_input;
  j["displayName"] = guess.display_name;
  j["normalizedName"] = guess.normalized_name;
  if (guess.apartment) j["apartment"] = *guess.apartment;
  j["houses"] = guess.houses;
  j["source"] = guess.source;
  return j;
}

json serialize_contribution(const Contribution& c) {
  json payload = {
      {"id", c.id},
      {"input", c.person_input},
      {"displayName", c.display_name},
      {"normalizedName", c.normalized_name},
      {"houses", c.houses},
      {"month", c.month},
      {"amount", c.amount},
      {"note", c.note},
      {"createdAt", c.created_at},
  };
  if (!c.apartment.empty()) payload["apartment"] = c.apartment;
  return payload;
}

json serialize_debtor(const Debtor& d) {
  json payload = {
      {"id", d.id},
      {"displayName", d.display_name},
      {"normalizedName", d.normalized_name},
      {"houses", d.houses},
      {"phone", d.phone},
      {"debt", d.debt},
      {"note", d.note},
      {"updatedAt", d.updated_at},
  };
  if (!d.apartment.empty()) payload["apartment"] = d.apartment;
  return payload;
}

bool fetch_contributions(AppContext& ctx, std::vector<Contribution>& out) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;
  const char* query =
      "SELECT id, COALESCE(person_input, ''), display_name, normalized_name, COALESCE(apartment, ''), COALESCE(houses, ARRAY[]::TEXT[]), month, amount, "
      "COALESCE(note, ''), COALESCE(to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), '') "
      "FROM contributions ORDER BY created_at DESC;";
  PGresult* res = PQexec(conn, query);
  if (PQresultStatus(res) != PGRES_TUPLES_OK) {
    PQclear(res);
    PQfinish(conn);
    return false;
  }
  const int rows = PQntuples(res);
  out.clear();
  out.reserve(rows);
  for (int i = 0; i < rows; ++i) {
    Contribution c;
    c.id = PQgetvalue(res, i, 0);
    c.person_input = PQgetvalue(res, i, 1);
    c.display_name = PQgetvalue(res, i, 2);
    c.normalized_name = PQgetvalue(res, i, 3);
    c.apartment = PQgetvalue(res, i, 4);
    c.houses = parse_pg_text_array(PQgetvalue(res, i, 5));
    c.month = PQgetvalue(res, i, 6);
    c.amount = std::strtod(PQgetvalue(res, i, 7), nullptr);
    c.note = PQgetvalue(res, i, 8);
    c.created_at = PQgetvalue(res, i, 9);
    out.push_back(std::move(c));
  }
  PQclear(res);
  PQfinish(conn);
  return true;
}

bool insert_contribution(AppContext& ctx, Contribution& c) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;

  const std::string houses = to_pg_text_array(c.houses);
  const std::string amount_str = std::to_string(c.amount);

  const char* paramValues[9];
  const int paramLengths[9] = {
      static_cast<int>(c.id.size()),
      static_cast<int>(c.person_input.size()),
      static_cast<int>(c.display_name.size()),
      static_cast<int>(c.normalized_name.size()),
      static_cast<int>(c.apartment.size()),
      static_cast<int>(houses.size()),
      static_cast<int>(c.month.size()),
      static_cast<int>(amount_str.size()),
      static_cast<int>(c.note.size()),
  };
  const int paramFormats[9] = {0, 0, 0, 0, 0, 0, 0, 0, 0};

  paramValues[0] = c.id.c_str();
  paramValues[1] = c.person_input.c_str();
  paramValues[2] = c.display_name.c_str();
  paramValues[3] = c.normalized_name.c_str();
  paramValues[4] = c.apartment.empty() ? nullptr : c.apartment.c_str();
  paramValues[5] = houses.c_str();
  paramValues[6] = c.month.c_str();
  paramValues[7] = amount_str.c_str();
  paramValues[8] = c.note.empty() ? nullptr : c.note.c_str();

  PGresult* res = PQexecParams(conn,
                               "INSERT INTO contributions (id, person_input, display_name, normalized_name, apartment, houses, month, amount, note) "
                               "VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) "
                               "RETURNING to_char(created_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ');",
                               9,
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

  if (PQntuples(res) > 0 && !PQgetisnull(res, 0, 0)) {
    c.created_at = PQgetvalue(res, 0, 0);
  }

  PQclear(res);
  PQfinish(conn);
  return true;
}

bool delete_contribution(AppContext& ctx, const std::string& id) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;
  const char* paramValues[1] = {id.c_str()};
  const int paramLengths[1] = {static_cast<int>(id.size())};
  const int paramFormats[1] = {0};
  PGresult* res = PQexecParams(conn, "DELETE FROM contributions WHERE id=$1;", 1, nullptr, paramValues, paramLengths, paramFormats, 0);
  const bool ok = PQresultStatus(res) == PGRES_COMMAND_OK;
  PQclear(res);
  PQfinish(conn);
  return ok;
}

bool fetch_contribution_summary(AppContext& ctx, json& out_summary) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;

  PGresult* agg = PQexec(conn, "SELECT month, SUM(amount) FROM contributions GROUP BY month;");
  if (PQresultStatus(agg) != PGRES_TUPLES_OK) {
    PQclear(agg);
    PQfinish(conn);
    return false;
  }

  PGresult* totals = PQexec(conn, "SELECT COUNT(*), COALESCE(SUM(amount),0), COUNT(DISTINCT normalized_name) FROM contributions;");
  if (PQresultStatus(totals) != PGRES_TUPLES_OK) {
    PQclear(agg);
    PQclear(totals);
    PQfinish(conn);
    return false;
  }

  out_summary = json::object();
  out_summary["byMonth"] = json::array();
  const int agg_rows = PQntuples(agg);
  for (int i = 0; i < agg_rows; ++i) {
    std::string month = PQgetvalue(agg, i, 0);
    double amount = std::strtod(PQgetvalue(agg, i, 1), nullptr);
    out_summary["byMonth"].push_back({{"month", month}, {"collected", amount}});
  }

  if (PQntuples(totals) > 0) {
    const std::string count_str = PQgetvalue(totals, 0, 0);
    const std::string total_str = PQgetvalue(totals, 0, 1);
    const std::string people_str = PQgetvalue(totals, 0, 2);
    out_summary["contributionCount"] = std::strtol(count_str.c_str(), nullptr, 10);
    out_summary["totalAmount"] = std::strtod(total_str.c_str(), nullptr);
    out_summary["peopleCount"] = std::strtol(people_str.c_str(), nullptr, 10);
  }

  PQclear(agg);
  PQclear(totals);
  PQfinish(conn);
  return true;
}

bool fetch_debtors(AppContext& ctx, std::vector<Debtor>& out) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;
  const char* query =
      "SELECT id, display_name, normalized_name, COALESCE(apartment, ''), COALESCE(houses, ARRAY[]::TEXT[]), COALESCE(phone, ''), debt, COALESCE(note, ''), "
      "COALESCE(to_char(updated_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ'), '') "
      "FROM debtors ORDER BY updated_at DESC;";
  PGresult* res = PQexec(conn, query);
  if (PQresultStatus(res) != PGRES_TUPLES_OK) {
    PQclear(res);
    PQfinish(conn);
    return false;
  }
  const int rows = PQntuples(res);
  out.clear();
  out.reserve(rows);
  for (int i = 0; i < rows; ++i) {
    Debtor d;
    d.id = PQgetvalue(res, i, 0);
    d.display_name = PQgetvalue(res, i, 1);
    d.normalized_name = PQgetvalue(res, i, 2);
    d.apartment = PQgetvalue(res, i, 3);
    d.houses = parse_pg_text_array(PQgetvalue(res, i, 4));
    d.phone = PQgetvalue(res, i, 5);
    d.debt = std::strtod(PQgetvalue(res, i, 6), nullptr);
    d.note = PQgetvalue(res, i, 7);
    d.updated_at = PQgetvalue(res, i, 8);
    out.push_back(std::move(d));
  }
  PQclear(res);
  PQfinish(conn);
  return true;
}

bool insert_debtor(AppContext& ctx, Debtor& d) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;

  const std::string houses = to_pg_text_array(d.houses);
  const std::string debt_str = std::to_string(d.debt);

  const char* paramValues[8];
  const int paramLengths[8] = {
      static_cast<int>(d.id.size()),
      static_cast<int>(d.display_name.size()),
      static_cast<int>(d.normalized_name.size()),
      static_cast<int>(d.apartment.size()),
      static_cast<int>(houses.size()),
      static_cast<int>(d.phone.size()),
      static_cast<int>(debt_str.size()),
      static_cast<int>(d.note.size()),
  };
  const int paramFormats[8] = {0, 0, 0, 0, 0, 0, 0, 0};

  paramValues[0] = d.id.c_str();
  paramValues[1] = d.display_name.empty() ? nullptr : d.display_name.c_str();
  paramValues[2] = d.normalized_name.c_str();
  paramValues[3] = d.apartment.empty() ? nullptr : d.apartment.c_str();
  paramValues[4] = houses.c_str();
  paramValues[5] = d.phone.empty() ? nullptr : d.phone.c_str();
  paramValues[6] = debt_str.c_str();
  paramValues[7] = d.note.empty() ? nullptr : d.note.c_str();

  PGresult* res = PQexecParams(conn,
                               "INSERT INTO debtors (id, display_name, normalized_name, apartment, houses, phone, debt, note) "
                               "VALUES ($1,$2,$3,$4,$5,$6,$7,$8) "
                               "RETURNING to_char(updated_at, 'YYYY-MM-DD\"T\"HH24:MI:SSZ');",
                               8,
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

  if (PQntuples(res) > 0 && !PQgetisnull(res, 0, 0)) {
    d.updated_at = PQgetvalue(res, 0, 0);
  }

  PQclear(res);
  PQfinish(conn);
  return true;
}

bool update_debtor(AppContext& ctx, const Debtor& d) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;
  const std::string houses = to_pg_text_array(d.houses);
  const std::string debt_str = std::to_string(d.debt);

  const char* paramValues[8];
  const int paramLengths[8] = {
      static_cast<int>(d.id.size()),
      static_cast<int>(d.display_name.size()),
      static_cast<int>(d.normalized_name.size()),
      static_cast<int>(d.apartment.size()),
      static_cast<int>(houses.size()),
      static_cast<int>(d.phone.size()),
      static_cast<int>(debt_str.size()),
      static_cast<int>(d.note.size()),
  };
  const int paramFormats[8] = {0, 0, 0, 0, 0, 0, 0, 0};

  paramValues[0] = d.id.c_str();
  paramValues[1] = d.display_name.c_str();
  paramValues[2] = d.normalized_name.c_str();
  paramValues[3] = d.apartment.empty() ? nullptr : d.apartment.c_str();
  paramValues[4] = houses.c_str();
  paramValues[5] = d.phone.empty() ? nullptr : d.phone.c_str();
  paramValues[6] = debt_str.c_str();
  paramValues[7] = d.note.empty() ? nullptr : d.note.c_str();

  PGresult* res = PQexecParams(conn,
                               "UPDATE debtors SET display_name=$2, normalized_name=$3, apartment=$4, houses=$5, phone=$6, debt=$7, note=$8, updated_at=NOW() "
                               "WHERE id=$1;",
                               8,
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

bool remove_debtor(AppContext& ctx, const std::string& id) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;
  const char* paramValues[1] = {id.c_str()};
  const int paramLengths[1] = {static_cast<int>(id.size())};
  const int paramFormats[1] = {0};
  PGresult* res = PQexecParams(conn, "DELETE FROM debtors WHERE id=$1;", 1, nullptr, paramValues, paramLengths, paramFormats, 0);
  const bool ok = PQresultStatus(res) == PGRES_COMMAND_OK;
  PQclear(res);
  PQfinish(conn);
  return ok;
}

std::string get_request_value(const httplib::Request& req, const std::string& key, const json& body_json) {
  if (!body_json.is_null() && body_json.contains(key)) {
    const auto& val = body_json.at(key);
    if (val.is_string()) return val.get<std::string>();
    if (val.is_number()) return std::to_string(val.get<double>());
  }
  if (req.has_param(key)) return req.get_param_value(key);
  auto it = req.files.find(key);
  if (it != req.files.end()) return it->second.content;
  return {};
}

std::vector<std::string> get_request_array(const httplib::Request& req, const std::string& key, const json& body_json) {
  std::vector<std::string> out;
  if (!body_json.is_null() && body_json.contains(key)) {
    const auto& val = body_json.at(key);
    if (val.is_array()) {
      for (const auto& v : val) {
        if (v.is_string()) out.push_back(v.get<std::string>());
        else if (v.is_number()) out.push_back(std::to_string(v.get<double>()));
      }
    } else if (val.is_string()) {
      out.push_back(val.get<std::string>());
    } else if (val.is_number()) {
      out.push_back(std::to_string(val.get<double>()));
    }
  }
  if (out.empty() && req.has_param(key)) {
    const std::string raw = req.get_param_value(key);
    const auto parts = split_number_list(raw);
    out.insert(out.end(), parts.begin(), parts.end());
  }
  return out;
}

double parse_amount(const std::string& raw) {
  try {
    return std::stod(raw);
  } catch (...) {
    return 0.0;
  }
}

std::vector<PersonGuess> load_known_people(AppContext& ctx) {
  std::vector<PersonGuess> known;
  std::vector<Contribution> contributions;
  if (fetch_contributions(ctx, contributions)) {
    for (const auto& c : contributions) {
      PersonGuess g;
      g.display_name = c.display_name;
      g.normalized_name = c.normalized_name;
      g.apartment = c.apartment.empty() ? std::optional<std::string>() : std::optional<std::string>(c.apartment);
      g.houses = c.houses;
      g.source = "история";
      g.confidence = 0.7;
      known.push_back(std::move(g));
    }
  }

  std::vector<Debtor> debtors;
  if (fetch_debtors(ctx, debtors)) {
    for (const auto& d : debtors) {
      PersonGuess g;
      g.display_name = d.display_name;
      g.normalized_name = d.normalized_name;
      g.apartment = d.apartment.empty() ? std::optional<std::string>() : std::optional<std::string>(d.apartment);
      g.houses = d.houses;
      g.source = "должник";
      g.confidence = 0.65;
      known.push_back(std::move(g));
    }
  }

  // Deduplicate by normalized name while preferring entries with houses/apartment.
  std::unordered_map<std::string, PersonGuess> dedup;
  for (const auto& g : known) {
    const auto it = dedup.find(g.normalized_name);
    if (it == dedup.end()) {
      dedup[g.normalized_name] = g;
      continue;
    }
    auto merged = it->second;
    merged.houses = unique_merge(merged.houses, g.houses);
    if (!merged.apartment && g.apartment) merged.apartment = g.apartment;
    dedup[g.normalized_name] = merged;
  }

  known.clear();
  known.reserve(dedup.size());
  for (auto& kv : dedup) {
    known.push_back(std::move(kv.second));
  }
  return known;
}

std::vector<PersonGuess> build_suggestions(const PersonGuess& parsed, const std::vector<PersonGuess>& known) {
  std::vector<PersonGuess> suggestions;
  std::vector<PersonGuess> location_matches;
  const bool has_name = !parsed.normalized_name.empty();
  const bool has_location = parsed.apartment.has_value() || !parsed.houses.empty();

  auto house_matches = [](const std::vector<std::string>& a, const std::vector<std::string>& b) {
    for (const auto& x : a) {
      for (const auto& y : b) {
        if (x == y) return true;
        if (!x.empty() && !y.empty() && (x.find(y) != std::string::npos || y.find(x) != std::string::npos)) return true;
      }
    }
    return false;
  };

  for (const auto& item : known) {
    if (has_name) {
      if (item.normalized_name == parsed.normalized_name ||
          item.normalized_name.find(parsed.normalized_name) != std::string::npos ||
          parsed.normalized_name.find(item.normalized_name) != std::string::npos) {
        suggestions.push_back(item);
      }
    }

    if (has_location) {
      const bool apt_match = parsed.apartment && item.apartment && *parsed.apartment == *item.apartment;
      const bool house_match = house_matches(parsed.houses, item.houses);
      if (apt_match || house_match) {
        location_matches.push_back(item);
      }
    }
  }

  if (!has_name && has_location && !location_matches.empty()) {
    suggestions = location_matches;
  } else if (!has_name && suggestions.empty()) {
    suggestions = known;  // fallback to anything we know
  }

  if (!parsed.display_name.empty()) {
    suggestions.insert(suggestions.begin(), parsed);
  }
  // keep top few suggestions and remove duplicates (name + location)
  auto key_for = [](const PersonGuess& g) {
    std::ostringstream oss;
    oss << g.normalized_name << "|";
    if (g.apartment) oss << *g.apartment;
    oss << "|";
    for (const auto& h : g.houses) oss << h << ",";
    return oss.str();
  };
  std::unordered_map<std::string, PersonGuess> dedup;
  for (const auto& s : suggestions) {
    const std::string k = key_for(s);
    if (dedup.find(k) == dedup.end()) dedup[k] = s;
  }
  suggestions.clear();
  for (auto& kv : dedup) suggestions.push_back(std::move(kv.second));
  std::sort(suggestions.begin(), suggestions.end(), [](const PersonGuess& a, const PersonGuess& b) {
    return a.confidence > b.confidence;
  });
  if (suggestions.size() > 6) suggestions.resize(6);
  return suggestions;
}

std::string normalize_month(const std::string& raw) {
  const std::string value = trim(raw);
  if (value.empty()) return current_month_label();
  for (const auto& m : kMonthOrder) {
    if (to_lower_utf8(m) == to_lower_utf8(value)) return m;
  }
  return value;
}

}  // namespace

void register_contribution_routes(httplib::Server& server, AppContext& ctx, const std::string& base_path) {
  const std::string base = base_path.empty() ? "/api/contributions" : (base_path.front() == '/' ? base_path : "/" + base_path);

  // List
  server.Get(base, [&](const httplib::Request&, httplib::Response& res) {
    std::vector<Contribution> list;
    if (!fetch_contributions(ctx, list)) {
      res.status = 500;
      res.set_content("Failed to load contributions", "text/plain");
      add_cors_headers(res);
      return;
    }
    json body;
    body["contributions"] = json::array();
    for (const auto& c : list) body["contributions"].push_back(serialize_contribution(c));

    json summary;
    if (fetch_contribution_summary(ctx, summary)) {
      body["summary"] = summary;
    }

    res.set_content(body.dump(), "application/json; charset=utf-8");
    add_cors_headers(res);
  });

  // Parse helper
  server.Post(base + "/parse", [&](const httplib::Request& req, httplib::Response& res) {
    json body_json;
    const auto content_type = req.get_header_value("Content-Type");
    if (content_type.find("application/json") != std::string::npos) {
      try {
        body_json = json::parse(req.body);
      } catch (...) {
      }
    }
    const std::string raw = get_request_value(req, "input", body_json);
    PersonGuess parsed = parse_person_input(raw);
    const auto known = load_known_people(ctx);
    const auto suggestions = build_suggestions(parsed, known);

    json payload;
    payload["resolved"] = person_guess_json(parsed);
    payload["suggestions"] = json::array();
    for (const auto& s : suggestions) {
      payload["suggestions"].push_back(person_guess_json(s));
    }

    res.set_content(payload.dump(), "application/json; charset=utf-8");
    add_cors_headers(res);
  });

  // Summary for charts
  server.Get(base + "/summary", [&](const httplib::Request&, httplib::Response& res) {
    json summary;
    if (!fetch_contribution_summary(ctx, summary)) {
      res.status = 500;
      res.set_content("Failed to build summary", "text/plain");
      add_cors_headers(res);
      return;
    }
    res.set_content(summary.dump(), "application/json; charset=utf-8");
    add_cors_headers(res);
  });

  // Known people list
  server.Get(base + "/people", [&](const httplib::Request&, httplib::Response& res) {
    const auto known = load_known_people(ctx);
    json payload;
    payload["people"] = json::array();
    for (const auto& k : known) payload["people"].push_back(person_guess_json(k));
    res.set_content(payload.dump(), "application/json; charset=utf-8");
    add_cors_headers(res);
  });

  // Create contribution
  server.Post(base, [&](const httplib::Request& req, httplib::Response& res) {
    json body_json;
    const auto content_type = req.get_header_value("Content-Type");
    if (content_type.find("application/json") != std::string::npos) {
      try {
        body_json = json::parse(req.body);
      } catch (...) {
      }
    }

    std::string raw_input = get_request_value(req, "input", body_json);
    std::string explicit_name = get_request_value(req, "displayName", body_json);
    PersonGuess parsed = parse_person_input(!raw_input.empty() ? raw_input : explicit_name);
    if (!explicit_name.empty()) {
      parsed.display_name = normalize_person_name(explicit_name);
      parsed.normalized_name = canonical_key(parsed.display_name);
    }

    const auto houses_override = get_request_array(req, "houses", body_json);
    if (!houses_override.empty()) parsed.houses = houses_override;
    const std::string apartment = get_request_value(req, "apartment", body_json);
    if (!apartment.empty()) parsed.apartment = apartment;

    const std::string amount_raw = get_request_value(req, "amount", body_json);
    const double amount = parse_amount(amount_raw);
    if (amount <= 0.0) {
      res.status = 400;
      res.set_content("Amount must be greater than zero", "text/plain");
      add_cors_headers(res);
      return;
    }

    const std::string month_raw = get_request_value(req, "month", body_json);
    const std::string note = get_request_value(req, "note", body_json);

    // Fill missing details from history if possible.
    const auto known = load_known_people(ctx);
    for (const auto& k : known) {
      if (!parsed.normalized_name.empty() && k.normalized_name == parsed.normalized_name) {
        if (parsed.houses.empty()) parsed.houses = k.houses;
        if (!parsed.apartment && k.apartment) parsed.apartment = k.apartment;
        if (parsed.display_name.empty()) parsed.display_name = k.display_name;
        break;
      }
    }

    Contribution c;
    c.id = "contrib-" + unique_id().substr(0, 12);
    c.person_input = !raw_input.empty() ? raw_input : parsed.display_name;
    c.display_name = parsed.display_name.empty() ? "Без имени" : parsed.display_name;
    c.normalized_name = parsed.normalized_name.empty() ? canonical_key(c.display_name) : parsed.normalized_name;
    c.apartment = parsed.apartment.value_or("");
    c.houses = parsed.houses;
    c.month = normalize_month(month_raw);
    c.amount = std::round(amount * 100.0) / 100.0;
    c.note = note;

    if (!insert_contribution(ctx, c)) {
      res.status = 500;
      res.set_content("Failed to save contribution", "text/plain");
      add_cors_headers(res);
      return;
    }

    json payload = serialize_contribution(c);
    payload["resolved"] = person_guess_json(parsed);
    res.status = 201;
    res.set_content(payload.dump(), "application/json; charset=utf-8");
    add_cors_headers(res);
  });

  // Delete contribution
  server.Delete(base + R"(/([^/]+))", [&](const httplib::Request& req, httplib::Response& res) {
    const auto& id = req.matches[1];
    if (!delete_contribution(ctx, id)) {
      res.status = 500;
      res.set_content("Failed to delete contribution", "text/plain");
      add_cors_headers(res);
      return;
    }
    res.status = 204;
    add_cors_headers(res);
  });
}

void register_debtor_routes(httplib::Server& server, AppContext& ctx, const std::string& base_path) {
  const std::string base = base_path.empty() ? "/api/debtors" : (base_path.front() == '/' ? base_path : "/" + base_path);

  // List
  server.Get(base, [&](const httplib::Request&, httplib::Response& res) {
    std::vector<Debtor> debtors;
    if (!fetch_debtors(ctx, debtors)) {
      res.status = 500;
      res.set_content("Failed to load debtors", "text/plain");
      add_cors_headers(res);
      return;
    }
    json body;
    body["debtors"] = json::array();
    for (const auto& d : debtors) body["debtors"].push_back(serialize_debtor(d));
    res.set_content(body.dump(), "application/json; charset=utf-8");
    add_cors_headers(res);
  });

  // Create
  server.Post(base, [&](const httplib::Request& req, httplib::Response& res) {
    json body_json;
    const auto content_type = req.get_header_value("Content-Type");
    if (content_type.find("application/json") != std::string::npos) {
      try {
        body_json = json::parse(req.body);
      } catch (...) {
      }
    }

    std::string raw_input = get_request_value(req, "input", body_json);
    std::string explicit_name = get_request_value(req, "displayName", body_json);
    PersonGuess parsed = parse_person_input(!raw_input.empty() ? raw_input : explicit_name);
    if (!explicit_name.empty()) {
      parsed.display_name = normalize_person_name(explicit_name);
      parsed.normalized_name = canonical_key(parsed.display_name);
    }

    const auto houses_override = get_request_array(req, "houses", body_json);
  if (!houses_override.empty()) parsed.houses = houses_override;
  const std::string apartment = get_request_value(req, "apartment", body_json);
  if (!apartment.empty()) parsed.apartment = apartment;

  const std::string phone = get_request_value(req, "phone", body_json);
  const std::string note = get_request_value(req, "note", body_json);
  const double debt = parse_amount(get_request_value(req, "debt", body_json));

  Debtor d;
  d.id = "debtor-" + unique_id().substr(0, 12);
  d.display_name = parsed.display_name;  // can be empty
  d.normalized_name = parsed.normalized_name.empty() ? canonical_key(d.display_name) : parsed.normalized_name;
  d.apartment = parsed.apartment.value_or("");
  d.houses = parsed.houses;
  d.phone = phone;
  d.debt = std::max(0.0, debt);
  d.note = note;

  if (d.normalized_name.empty() && !d.houses.empty()) {
    d.normalized_name = canonical_house_key(d.houses);
  }

  // Attempt to merge with an existing debtor if the key or house matches.
  std::vector<Debtor> existing_debtors;
    if (fetch_debtors(ctx, existing_debtors)) {
      const std::string new_house_key = canonical_house_key(d.houses);
      for (const auto& existing : existing_debtors) {
        const bool name_match = !d.normalized_name.empty() && !existing.normalized_name.empty() &&
                                d.normalized_name == existing.normalized_name;
        const std::string existing_house_key = canonical_house_key(existing.houses);
        const bool house_match = !new_house_key.empty() && !existing_house_key.empty() &&
                                 new_house_key == existing_house_key &&
                                 d.normalized_name.empty() && existing.normalized_name.empty();
        if (name_match || house_match) {
          Debtor updated = existing;
          if (updated.display_name.empty() && !d.display_name.empty()) updated.display_name = d.display_name;
          if (updated.normalized_name.empty()) {
            updated.normalized_name = !d.normalized_name.empty() ? d.normalized_name : new_house_key;
        }
        if (updated.apartment.empty() && !d.apartment.empty()) updated.apartment = d.apartment;
        if (updated.phone.empty() && !d.phone.empty()) updated.phone = d.phone;
        if (updated.note.empty() && !d.note.empty()) updated.note = d.note;
        // Replace debt if a new value is provided; otherwise keep existing.
        if (d.debt > 0) updated.debt = d.debt;
          // Union houses
          std::set<std::string> merged_houses(existing.houses.begin(), existing.houses.end());
          merged_houses.insert(d.houses.begin(), d.houses.end());
          updated.houses.assign(merged_houses.begin(), merged_houses.end());

          if (!update_debtor(ctx, updated)) {
            res.status = 500;
            res.set_content("Failed to update debtor", "text/plain");
            add_cors_headers(res);
            return;
          }

          res.status = 200;
          res.set_content(serialize_debtor(updated).dump(), "application/json; charset=utf-8");
          add_cors_headers(res);
          return;
        }
      }
    }

    if (!insert_debtor(ctx, d)) {
      res.status = 500;
      res.set_content("Failed to save debtor", "text/plain");
      add_cors_headers(res);
      return;
    }

    json payload = serialize_debtor(d);
    payload["resolved"] = person_guess_json(parsed);
    res.status = 201;
    res.set_content(payload.dump(), "application/json; charset=utf-8");
    add_cors_headers(res);
  });

  // Update
  server.Put(base + R"(/([^/]+))", [&](const httplib::Request& req, httplib::Response& res) {
    const auto& id = req.matches[1];
    json body_json;
    const auto content_type = req.get_header_value("Content-Type");
    if (content_type.find("application/json") != std::string::npos) {
      try {
        body_json = json::parse(req.body);
      } catch (...) {
      }
    }

    // Load existing for merge
    std::vector<Debtor> debtors;
    if (!fetch_debtors(ctx, debtors)) {
      res.status = 500;
      res.set_content("Failed to load debtors", "text/plain");
      add_cors_headers(res);
      return;
    }
    auto it = std::find_if(debtors.begin(), debtors.end(), [&](const Debtor& d) { return d.id == id; });
    if (it == debtors.end()) {
      res.status = 404;
      res.set_content("Debtor not found", "text/plain");
      add_cors_headers(res);
      return;
    }

    Debtor updated = *it;
    const std::string display = get_request_value(req, "displayName", body_json);
    if (!display.empty()) {
      updated.display_name = normalize_person_name(display);
      updated.normalized_name = canonical_key(updated.display_name);
    }
    const std::string apartment = get_request_value(req, "apartment", body_json);
    if (!apartment.empty()) updated.apartment = apartment;
    const auto houses = get_request_array(req, "houses", body_json);
    if (!houses.empty()) updated.houses = houses;

    const std::string phone = get_request_value(req, "phone", body_json);
    if (!phone.empty()) updated.phone = phone;
    const std::string note = get_request_value(req, "note", body_json);
    if (!note.empty()) updated.note = note;
    const std::string debt_raw = get_request_value(req, "debt", body_json);
    if (!debt_raw.empty()) updated.debt = std::max(0.0, parse_amount(debt_raw));

    if (!update_debtor(ctx, updated)) {
      res.status = 500;
      res.set_content("Failed to update debtor", "text/plain");
      add_cors_headers(res);
      return;
    }

    res.set_content(serialize_debtor(updated).dump(), "application/json; charset=utf-8");
    add_cors_headers(res);
  });

  // Delete
  server.Delete(base + R"(/([^/]+))", [&](const httplib::Request& req, httplib::Response& res) {
    const auto& id = req.matches[1];
    if (!remove_debtor(ctx, id)) {
      res.status = 500;
      res.set_content("Failed to delete debtor", "text/plain");
      add_cors_headers(res);
      return;
    }
    res.status = 204;
    add_cors_headers(res);
  });
}
