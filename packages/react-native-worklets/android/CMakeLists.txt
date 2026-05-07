cmake_minimum_required(VERSION 3.18)
project(Worklets)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Consume shared libraries and headers from prefabs
find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)

if(JS_RUNTIME STREQUAL "hermes")
  find_package(hermes-engine REQUIRED CONFIG)
endif()

# default CMAKE_CXX_FLAGS: "-g -DANDROID -fdata-sections -ffunction-sections
# -funwind-tables -fstack-protector-strong -no-canonical-prefixes
# -D_FORTIFY_SOURCE=2 -Wformat -Werror=format-security -fstack-protector-all"
include("${REACT_NATIVE_DIR}/ReactAndroid/cmake-utils/folly-flags.cmake")
add_compile_options(${folly_FLAGS})

set(ANDROID_CPP_DIR "${CMAKE_SOURCE_DIR}/src/main/cpp")
set(COMMON_CPP_DIR "${CMAKE_SOURCE_DIR}/../Common/cpp")

file(GLOB_RECURSE WORKLETS_COMMON_CPP_SOURCES CONFIGURE_DEPENDS
     "${COMMON_CPP_DIR}/worklets/*.cpp")
file(GLOB_RECURSE WORKLETS_ANDROID_CPP_SOURCES CONFIGURE_DEPENDS
     "${ANDROID_CPP_DIR}/worklets/*.cpp")

add_library(worklets SHARED ${WORKLETS_COMMON_CPP_SOURCES}
                            ${WORKLETS_ANDROID_CPP_SOURCES})

if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 80)
  include(
    "${REACT_NATIVE_DIR}/ReactCommon/cmake-utils/react-native-flags.cmake")
  target_compile_reactnative_options(worklets PUBLIC)
else()
  target_compile_options(worklets PRIVATE
    -fexceptions
    -frtti
    -Wall
    -Werror)
endif()

target_compile_definitions(worklets PRIVATE
  "WORKLETS_VERSION=${WORKLETS_VERSION}"
  "WORKLETS_FEATURE_FLAGS=${WORKLETS_FEATURE_FLAGS}")

target_compile_options(worklets PRIVATE
  -fno-omit-frame-pointer
  -fstack-protector-all)

# HERMES_V1_ENABLED is centralized in react-native-flags.cmake for RN >= 84.
# Only define manually for older versions to avoid macro redefinition error.
if(ReactAndroid_VERSION_MINOR LESS 84)
  target_compile_definitions(worklets PRIVATE
    "HERMES_V1_ENABLED=${HERMES_V1_ENABLED}")
endif()

if(WORKLETS_PROFILING)
  target_compile_definitions(worklets PRIVATE WORKLETS_PROFILING)
endif()

if(IS_REANIMATED_EXAMPLE_APP)
  target_compile_definitions(worklets PRIVATE IS_REANIMATED_EXAMPLE_APP)
  target_compile_options(worklets PRIVATE -Wpedantic)
endif()

if(WORKLETS_FETCH_PREVIEW_ENABLED)
  target_compile_definitions(worklets PRIVATE WORKLETS_FETCH_PREVIEW_ENABLED)
endif()

if(JS_RUNTIME STREQUAL "hermes")
  target_compile_definitions(worklets PRIVATE JS_RUNTIME_HERMES=1)
elseif(JS_RUNTIME STREQUAL "jsc")
  target_compile_definitions(worklets PRIVATE JS_RUNTIME_JSC=1)
else()
  message(FATAL_ERROR "Unknown JS runtime ${JS_RUNTIME}.")
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

target_link_libraries(worklets android log ReactAndroid::reactnative
                      ReactAndroid::jsi fbjni::fbjni)

if(JS_RUNTIME STREQUAL "hermes")
  if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 82)
    target_link_libraries(worklets hermes-engine::hermesvm)
  else()
    target_link_libraries(worklets hermes-engine::libhermes)
  endif()

  if(HERMES_ENABLE_DEBUGGER)
    target_compile_definitions(worklets PRIVATE HERMES_ENABLE_DEBUGGER=1)
    target_link_libraries(worklets ReactAndroid::hermestooling)
  endif()
elseif(JS_RUNTIME STREQUAL "jsc")
  target_link_libraries(worklets ReactAndroid::jsctooling)
endif()
