project(Worklets)
cmake_minimum_required(VERSION 3.16)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

set(CMAKE_CXX_STANDARD 20)

# Consume shared libraries and headers from prefabs
find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)
find_package(hermes-engine REQUIRED CONFIG)

# default CMAKE_CXX_FLAGS: "-g -DANDROID -fdata-sections -ffunction-sections
# -funwind-tables -fstack-protector-strong -no-canonical-prefixes
# -D_FORTIFY_SOURCE=2 -Wformat -Werror=format-security -fstack-protector-all"
include("${REACT_NATIVE_DIR}/ReactAndroid/cmake-utils/folly-flags.cmake")
add_compile_options(${folly_FLAGS})

string(APPEND CMAKE_CXX_FLAGS " -DWORKLETS_VERSION=${WORKLETS_VERSION}\
    -DWORKLETS_FEATURE_FLAGS=\"${WORKLETS_FEATURE_FLAGS}\"")

# HERMES_V1_ENABLED is centralized in react-native-flags.cmake for RN >= 84.
# Only define manually for older versions to avoid macro redefinition error.
if(ReactAndroid_VERSION_MINOR LESS 84)
  string(APPEND CMAKE_CXX_FLAGS " -DHERMES_V1_ENABLED=${HERMES_V1_ENABLED}")
endif()

string(APPEND CMAKE_CXX_FLAGS " -fno-omit-frame-pointer -fstack-protector-all")

if(${WORKLETS_PROFILING})
  string(APPEND CMAKE_CXX_FLAGS " -DWORKLETS_PROFILING")
endif()
if(${IS_REANIMATED_EXAMPLE_APP})
  string(APPEND CMAKE_CXX_FLAGS " -DIS_REANIMATED_EXAMPLE_APP -Wpedantic")
endif()
if(${WORKLETS_FETCH_PREVIEW_ENABLED})
  string(APPEND CMAKE_CXX_FLAGS " -DWORKLETS_FETCH_PREVIEW_ENABLED")
endif()

if(NOT ${CMAKE_BUILD_TYPE} MATCHES "Debug")
  string(APPEND CMAKE_CXX_FLAGS " -DNDEBUG")
endif()

set(BUILD_DIR "${CMAKE_SOURCE_DIR}/build")
set(ANDROID_CPP_DIR "${CMAKE_SOURCE_DIR}/src/main/cpp")
set(COMMON_CPP_DIR "${CMAKE_SOURCE_DIR}/../Common/cpp")

file(GLOB_RECURSE WORKLETS_COMMON_CPP_SOURCES CONFIGURE_DEPENDS
     "${COMMON_CPP_DIR}/worklets/*.cpp")
file(GLOB_RECURSE WORKLETS_ANDROID_CPP_SOURCES CONFIGURE_DEPENDS
     "${ANDROID_CPP_DIR}/worklets/*.cpp")

add_library(worklets SHARED ${WORKLETS_COMMON_CPP_SOURCES}
                            ${WORKLETS_ANDROID_CPP_SOURCES})

target_precompile_headers(worklets PRIVATE "${ANDROID_CPP_DIR}/WorkletsPCH.h")

if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 80)
  include(
    "${REACT_NATIVE_DIR}/ReactCommon/cmake-utils/react-native-flags.cmake")
  target_compile_reactnative_options(worklets PUBLIC)
else()
  string(APPEND CMAKE_CXX_FLAGS
         " -fexceptions -frtti -std=c++${CMAKE_CXX_STANDARD} -Wall -Werror")
endif()

# includes
target_include_directories(worklets PUBLIC "${COMMON_CPP_DIR}"
                                           "${ANDROID_CPP_DIR}")

target_include_directories(
  worklets
  PRIVATE "${REACT_NATIVE_DIR}/ReactCommon"
          "${REACT_NATIVE_DIR}/ReactCommon/yoga"
          "${REACT_NATIVE_DIR}/ReactAndroid/src/main/jni/react/turbomodule"
          "${REACT_NATIVE_DIR}/ReactCommon/react/nativemodule/core/ReactCommon"
          "${REACT_NATIVE_DIR}/ReactCommon/callinvoker"
          "${REACT_NATIVE_DIR}/ReactCommon/runtimeexecutor"
          "${REACT_NATIVE_DIR}/ReactCommon/jsiexecutor"
          "${REACT_NATIVE_DIR}/ReactCommon/react/renderer/graphics/platform/cxx"
)

# build shared lib
set_target_properties(worklets PROPERTIES LINKER_LANGUAGE CXX)

target_link_libraries(worklets android log ReactAndroid::reactnative
                      ReactAndroid::jsi fbjni::fbjni)

if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 82)
  target_link_libraries(worklets hermes-engine::hermesvm)
else()
  target_link_libraries(worklets hermes-engine::libhermes)
endif()

if(${HERMES_ENABLE_DEBUGGER})
  string(APPEND CMAKE_CXX_FLAGS " -DHERMES_ENABLE_DEBUGGER=1")
endif()
