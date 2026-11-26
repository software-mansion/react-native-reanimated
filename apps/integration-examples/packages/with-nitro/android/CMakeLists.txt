cmake_minimum_required(VERSION 3.9.0)
project(WithNitro)

set(CMAKE_CXX_STANDARD 20)

add_library(WithNitro SHARED src/main/cpp/cpp-adapter.cpp
                             ../cpp/HybridCounter.cpp)
include(
  ${CMAKE_SOURCE_DIR}/../nitrogen/generated/android/WithNitro+autolinking.cmake)
include_directories(../cpp)

find_package(react-native-worklets REQUIRED CONFIG)
target_link_libraries(WithNitro react-native-worklets::worklets)
target_compile_definitions(WithNitro
                           PRIVATE "WORKLETS_STABLE_API_TARGET=\"0.14.0\"")
