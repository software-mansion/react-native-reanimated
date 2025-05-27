project(Reanimated)
cmake_minimum_required(VERSION 3.8)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

set(CMAKE_CXX_STANDARD 20)

# default CMAKE_CXX_FLAGS: "-g -DANDROID -fdata-sections -ffunction-sections
# -funwind-tables -fstack-protector-strong -no-canonical-prefixes
# -D_FORTIFY_SOURCE=2 -Wformat -Werror=format-security -fstack-protector-all"
include("${REACT_NATIVE_DIR}/ReactAndroid/cmake-utils/folly-flags.cmake")
add_compile_options(${folly_FLAGS})

string(APPEND CMAKE_CXX_FLAGS
       " -DREACT_NATIVE_MINOR_VERSION=${REACT_NATIVE_MINOR_VERSION}\
   -DREANIMATED_VERSION=${REANIMATED_VERSION}")

string(APPEND CMAKE_CXX_FLAGS
       " -fexceptions -fno-omit-frame-pointer -frtti -fstack-protector-all\
   -std=c++${CMAKE_CXX_STANDARD} -Wall -Werror")

if(${IS_NEW_ARCHITECTURE_ENABLED})
  string(APPEND CMAKE_CXX_FLAGS " -DRCT_NEW_ARCH_ENABLED")
endif()

if(${IS_REANIMATED_EXAMPLE_APP})
  string(APPEND CMAKE_CXX_FLAGS " -DIS_REANIMATED_EXAMPLE_APP -Wpedantic")
endif()

if(NOT ${CMAKE_BUILD_TYPE} MATCHES "Debug")
  string(APPEND CMAKE_CXX_FLAGS " -DNDEBUG")
endif()

if(${JS_RUNTIME} STREQUAL "hermes")
  if(${HERMES_ENABLE_DEBUGGER})
    string(APPEND CMAKE_CXX_FLAGS " -DHERMES_ENABLE_DEBUGGER=1")
  endif()
  string(APPEND CMAKE_CXX_FLAGS " -DJS_RUNTIME_HERMES=1")
elseif(${JS_RUNTIME} STREQUAL "jsc")
  string(APPEND CMAKE_CXX_FLAGS " -DJS_RUNTIME_JSC=1")
elseif(${JS_RUNTIME} STREQUAL "v8")
  string(APPEND CMAKE_CXX_FLAGS " -DJS_RUNTIME_V8=1")
else()
  message(FATAL_ERROR "Unknown JS runtime ${JS_RUNTIME}.")
endif()

# Resolves "CMake Warning: Manually-specified variables were not used by the
# project" when any of the following variables is not used in some build
# configuration.
set(IGNORE_ME "${JS_RUNTIME_DIR}")

set(BUILD_DIR "${CMAKE_SOURCE_DIR}/build")
set(ANDROID_CPP_DIR "${CMAKE_SOURCE_DIR}/src/main/cpp")
set(COMMON_CPP_DIR "${CMAKE_SOURCE_DIR}/../Common/cpp")

add_subdirectory("${ANDROID_CPP_DIR}/worklets")
add_subdirectory("${ANDROID_CPP_DIR}/reanimated")
