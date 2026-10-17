cmake_minimum_required(VERSION 3.20)
project(escape_office LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

find_package(SDL2 REQUIRED)

add_library(escape_office_core STATIC
  src/game.cpp
  src/renderer.cpp
)
target_include_directories(escape_office_core PUBLIC include)

add_executable(escape_office src/main.cpp)
target_link_libraries(escape_office PRIVATE escape_office_core SDL2::SDL2)

add_executable(escape_office_tests tests/game_tests.cpp)
target_link_libraries(escape_office_tests PRIVATE escape_office_core)

foreach(target escape_office_core escape_office escape_office_tests)
  target_compile_options(${target} PRIVATE
    -Wall
    -Wextra
    -Wpedantic
    -Wconversion
    -Wsign-conversion
    -Wshadow
    -Werror
  )
endforeach()

enable_testing()
add_test(NAME escape_office_tests COMMAND escape_office_tests)
