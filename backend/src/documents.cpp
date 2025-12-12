#include "documents.h"

#include <chrono>
#include <cctype>
#include <fstream>
#include <iomanip>
#include <random>
#include <sstream>
#include <stdexcept>

#include "db.h"
#include "json.hpp"

namespace fs = std::filesystem;
using json = nlohmann::json;

namespace {

bool file_exists(const fs::path& p) {
  std::error_code ec;
  return fs::exists(p, ec);
}

std::string get_form_value(const httplib::Request& req, const std::string& name) {
  if (req.has_param(name)) {
    return req.get_param_value(name);
  }
  auto it = req.files.find(name);
  if (it != req.files.end()) {
    return it->second.content;
  }
  return {};
}

std::string guess_mime(const std::string& ext) {
  std::string out = ext;
  for (auto& ch : out) ch = static_cast<char>(std::tolower(static_cast<unsigned char>(ch)));
  if (out == ".pdf") return "application/pdf";
  if (out == ".doc") return "application/msword";
  if (out == ".docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (out == ".xls") return "application/vnd.ms-excel";
  if (out == ".xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return "application/octet-stream";
}

void add_cors_headers(httplib::Response& res) {
  res.set_header("Access-Control-Allow-Origin", "*");
  res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set_header("Access-Control-Allow-Headers", "Content-Type");
}

std::string to_ascii_slug(const std::string& input) {
  std::string out;
  out.reserve(input.size());
  for (char c : input) {
    if (std::isalnum(static_cast<unsigned char>(c))) {
      out.push_back(static_cast<char>(std::tolower(static_cast<unsigned char>(c))));
    } else if (c == ' ' || c == '-' || c == '_' || c == '.') {
      out.push_back('-');
    }
  }
  std::string compact;
  bool last_dash = false;
  for (char c : out) {
    if (c == '-') {
      if (!last_dash) compact.push_back(c);
      last_dash = true;
    } else {
      compact.push_back(c);
      last_dash = false;
    }
  }
  while (!compact.empty() && compact.front() == '-') compact.erase(compact.begin());
  while (!compact.empty() && compact.back() == '-') compact.pop_back();
  return compact.empty() ? "document" : compact;
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

std::string unique_filename(const std::string& original_name) {
  fs::path p(original_name);
  const std::string ext = p.has_extension() ? p.extension().string() : "";
  const std::string stem = p.has_stem() ? to_ascii_slug(p.stem().string()) : "document";
  return stem + "-" + unique_id().substr(0, 8) + ext;
}

std::string normalize_category(const std::string& raw) {
  auto trim = [](const std::string& s) {
    const char* ws = " \t\n\r";
    const auto start = s.find_first_not_of(ws);
    if (start == std::string::npos) return std::string();
    const auto end = s.find_last_not_of(ws);
    return s.substr(start, end - start + 1);
  };
  const std::string trimmed = trim(raw);
  if (trimmed.empty()) return "Общее";
  std::string lower = trimmed;
  for (auto& c : lower) c = static_cast<char>(std::tolower(static_cast<unsigned char>(c)));
  if (lower == "общее") return "Общее";
  return trimmed;
}

std::string build_download_filename(const Document& doc) {
  fs::path original(doc.filename);
  const std::string ext = original.has_extension() ? original.extension().string() : "";
  if (!doc.title.empty()) {
    return to_ascii_slug(doc.title) + ext;
  }
  return doc.filename.empty() ? "document" + ext : doc.filename;
}

std::string content_disposition_with_utf8(const Document& doc) {
  const std::string safe_name = build_download_filename(doc);
  const std::string utf8_name = doc.title.empty() ? doc.filename : (doc.title + fs::path(doc.filename).extension().string());

  std::ostringstream oss;
  oss << "attachment; filename=\"" << safe_name << "\"";
  oss << "; filename*=UTF-8''";
  oss << std::hex << std::uppercase;
  for (unsigned char c : utf8_name) {
    if (std::isalnum(c) || c == '.' || c == '_' || c == '-') {
      oss << static_cast<char>(c);
    } else {
      oss << '%' << std::setw(2) << std::setfill('0') << static_cast<int>(c);
    }
  }
  return oss.str();
}

json serialize_document(const Document& doc, const fs::path& files_dir) {
  fs::path file_path = files_dir / doc.filename;
  std::error_code ec;
  std::uintmax_t size = fs::file_size(file_path, ec);
  if (ec) size = 0;

  json payload = {
      {"id", doc.id},
      {"title", doc.title},
      {"category", doc.category},
      {"description", doc.description},
      {"fileName", doc.filename},
      {"type", file_path.extension().string()},
      {"sizeBytes", size},
      {"downloadUrl", "/documents/" + doc.id + "/download"},
  };
  if (doc.year) payload["year"] = *doc.year;
  return payload;
}

bool fetch_documents(AppContext& ctx, std::vector<Document>& out_docs) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;
  const char* query = "SELECT id, filename, title, category, description, year FROM documents ORDER BY title;";
  PGresult* res = PQexec(conn, query);
  if (PQresultStatus(res) != PGRES_TUPLES_OK) {
    PQclear(res);
    PQfinish(conn);
    return false;
  }
  int rows = PQntuples(res);
  out_docs.clear();
  out_docs.reserve(rows);
  for (int i = 0; i < rows; ++i) {
    Document d;
    d.id = PQgetvalue(res, i, 0);
    d.filename = PQgetvalue(res, i, 1);
    d.title = PQgetvalue(res, i, 2);
    d.category = PQgetvalue(res, i, 3);
    d.description = PQgetisnull(res, i, 4) ? "" : PQgetvalue(res, i, 4);
    if (!PQgetisnull(res, i, 5)) {
      try {
        d.year = std::stoi(PQgetvalue(res, i, 5));
      } catch (...) {
        d.year = std::nullopt;
      }
    }
    if (ctx.hidden_ids.find(d.id) == ctx.hidden_ids.end()) {
      out_docs.push_back(std::move(d));
    }
  }
  PQclear(res);
  PQfinish(conn);
  return true;
}

bool fetch_document_by_id(AppContext& ctx, const std::string& id, Document& doc) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;
  const char* paramValues[1] = {id.c_str()};
  const int paramLengths[1] = {static_cast<int>(id.size())};
  const int paramFormats[1] = {0};
  PGresult* res = PQexecParams(conn,
                               "SELECT id, filename, title, category, description, year FROM documents WHERE id=$1 LIMIT 1;",
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
  if (PQntuples(res) == 0) {
    PQclear(res);
    PQfinish(conn);
    return false;
  }
  doc.id = PQgetvalue(res, 0, 0);
  doc.filename = PQgetvalue(res, 0, 1);
  doc.title = PQgetvalue(res, 0, 2);
  doc.category = PQgetvalue(res, 0, 3);
  doc.description = PQgetisnull(res, 0, 4) ? "" : PQgetvalue(res, 0, 4);
  if (!PQgetisnull(res, 0, 5)) {
    try {
      doc.year = std::stoi(PQgetvalue(res, 0, 5));
    } catch (...) {
      doc.year = std::nullopt;
    }
  }
  PQclear(res);
  PQfinish(conn);
  return ctx.hidden_ids.find(doc.id) == ctx.hidden_ids.end();
}

bool insert_document(AppContext& ctx, Document& doc) {
  PGconn* conn = db_connect(ctx.db);
  if (!conn) return false;

  const char* paramValues[6];
  std::string year_str;
  year_str = doc.year ? std::to_string(*doc.year) : "";
  paramValues[0] = doc.id.c_str();
  paramValues[1] = doc.filename.c_str();
  paramValues[2] = doc.title.c_str();
  paramValues[3] = doc.category.c_str();
  paramValues[4] = doc.description.c_str();
  paramValues[5] = doc.year ? year_str.c_str() : nullptr;

  const int paramFormats[6] = {0, 0, 0, 0, 0, 0};
  const int paramLengths[6] = {static_cast<int>(doc.id.size()),
                               static_cast<int>(doc.filename.size()),
                               static_cast<int>(doc.title.size()),
                               static_cast<int>(doc.category.size()),
                               static_cast<int>(doc.description.size()),
                               doc.year ? static_cast<int>(year_str.size()) : 0};

  PGresult* res = PQexecParams(conn,
                               "INSERT INTO documents (id, filename, title, category, description, year) "
                               "VALUES ($1,$2,$3,$4,$5,$6);",
                               6,
                               nullptr,
                               paramValues,
                               paramLengths,
                               paramFormats,
                               0);
  if (PQresultStatus(res) != PGRES_COMMAND_OK) {
    PQclear(res);
    PQfinish(conn);
    return false;
  }
  PQclear(res);
  PQfinish(conn);
  return true;
}

void register_single_document_routes(httplib::Server& server, AppContext& ctx, const std::string& base) {
  // List
  server.Get(base, [&](const httplib::Request&, httplib::Response& res) {
    std::vector<Document> docs;
    if (!fetch_documents(ctx, docs)) {
      res.status = 500;
      res.set_content("Failed to load documents", "text/plain");
      add_cors_headers(res);
      return;
    }
    json body;
    body["documents"] = json::array();
    for (const auto& doc : docs) {
      body["documents"].push_back(serialize_document(doc, ctx.files_dir));
    }
    res.set_content(body.dump(), "application/json; charset=utf-8");
    add_cors_headers(res);
  });

  // Upload
  server.Post(base, [&](const httplib::Request& req, httplib::Response& res) {
    if (!req.is_multipart_form_data()) {
      res.status = 400;
      res.set_content("Expected multipart/form-data", "text/plain");
      add_cors_headers(res);
      return;
    }
    if (!req.has_file("file")) {
      res.status = 400;
      res.set_content("Missing file field", "text/plain");
      add_cors_headers(res);
      return;
    }
    auto file = req.get_file_value("file");
    if (file.content.empty()) {
      res.status = 400;
      res.set_content("Empty file", "text/plain");
      add_cors_headers(res);
      return;
    }

    const std::string title_raw = get_form_value(req, "title");
    const std::string category_raw = get_form_value(req, "category");
    const std::string description = get_form_value(req, "description");

    const std::string title = !title_raw.empty() ? title_raw : (!file.filename.empty() ? file.filename : "Документ");
    const std::string category = normalize_category(category_raw);
    std::optional<int> year;
    const std::string year_raw = get_form_value(req, "year");
    if (!year_raw.empty()) {
      try {
        year = std::stoi(year_raw);
      } catch (...) {
        year = std::nullopt;
      }
    }

    Document doc;
    doc.id = "doc-" + unique_id().substr(0, 12);
    doc.filename = unique_filename(file.filename.empty() ? "document" : file.filename);
    doc.title = title;
    doc.category = category;
    doc.description = description;
    doc.year = year;

    std::error_code ec;
    fs::create_directories(ctx.files_dir, ec);
    std::ofstream out(ctx.files_dir / doc.filename, std::ios::binary);
    if (!out) {
      res.status = 500;
      res.set_content("Failed to save file", "text/plain");
      add_cors_headers(res);
      return;
    }
    out.write(file.content.data(), static_cast<std::streamsize>(file.content.size()));
    out.close();

    if (!insert_document(ctx, doc)) {
      res.status = 500;
      res.set_content("Failed to persist document", "text/plain");
      add_cors_headers(res);
      return;
    }

    auto response_body = serialize_document(doc, ctx.files_dir);
    res.status = 201;
    res.set_content(response_body.dump(), "application/json; charset=utf-8");
    add_cors_headers(res);
  });

  // Hide
  server.Post(base + R"(/(.+)/hide)", [&](const httplib::Request& req, httplib::Response& res) {
    const auto& id = req.matches[1];
    ctx.hidden_ids.insert(id);
    res.status = 204;
    add_cors_headers(res);
  });

  // Download
  server.Get(base + R"(/(.+)/download)", [&](const httplib::Request& req, httplib::Response& res) {
    const auto& id = req.matches[1];
    Document doc;
    if (!fetch_document_by_id(ctx, id, doc)) {
      res.status = 404;
      res.set_content("Document not found", "text/plain");
      add_cors_headers(res);
      return;
    }
    const fs::path file_path = ctx.files_dir / doc.filename;
    if (!file_exists(file_path)) {
      res.status = 404;
      res.set_content("File missing on server", "text/plain");
      add_cors_headers(res);
      return;
    }
    std::ifstream file(file_path, std::ios::binary);
    if (!file) {
      res.status = 500;
      res.set_content("Failed to read file", "text/plain");
      add_cors_headers(res);
      return;
    }
    std::string buffer((std::istreambuf_iterator<char>(file)), std::istreambuf_iterator<char>());
    const std::string mime = guess_mime(file_path.extension().string());
    res.set_header("Content-Disposition", content_disposition_with_utf8(doc));
    res.set_content(buffer, mime.c_str());
    add_cors_headers(res);
  });
}

}  // namespace

void register_document_routes(httplib::Server& server, AppContext& ctx, const std::string& base_path) {
  register_single_document_routes(server, ctx, base_path);
}
