cmake_minimum_required(VERSION 3.14)
project(hoa_backend LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

add_executable(hoa_backend
  src/main.cpp
  src/db.cpp
  src/documents.cpp
)
target_include_directories(hoa_backend PRIVATE ${CMAKE_CURRENT_SOURCE_DIR}/include)

find_package(Threads REQUIRED)
find_package(PostgreSQL REQUIRED)

target_link_libraries(hoa_backend PRIVATE Threads::Threads PostgreSQL::PostgreSQL)
