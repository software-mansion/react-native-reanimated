cmake_minimum_required(VERSION 3.18)
project(Reanimated)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# default CMAKE_CXX_FLAGS: "-g -DANDROID -fdata-sections -ffunction-sections
# -funwind-tables -fstack-protector-strong -no-canonical-prefixes
# -D_FORTIFY_SOURCE=2 -Wformat -Werror=format-security -fstack-protector-all"
include("${REACT_NATIVE_DIR}/ReactAndroid/cmake-utils/folly-flags.cmake")
add_compile_options(${folly_FLAGS})

find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)
find_package(react-native-worklets REQUIRED CONFIG)

set(ANDROID_CPP_DIR "${CMAKE_SOURCE_DIR}/src/main/cpp")
set(COMMON_CPP_DIR "${CMAKE_SOURCE_DIR}/../Common/cpp")

file(GLOB_RECURSE REANIMATED_COMMON_CPP_SOURCES CONFIGURE_DEPENDS
     "${COMMON_CPP_DIR}/reanimated/*.cpp")
file(GLOB_RECURSE REANIMATED_ANDROID_CPP_SOURCES CONFIGURE_DEPENDS
     "${ANDROID_CPP_DIR}/reanimated/*.cpp")

add_library(reanimated SHARED ${REANIMATED_COMMON_CPP_SOURCES}
                              ${REANIMATED_ANDROID_CPP_SOURCES})

if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 80)
  include(
    "${REACT_NATIVE_DIR}/ReactCommon/cmake-utils/react-native-flags.cmake")
  target_compile_reactnative_options(reanimated PUBLIC)
else()
  target_compile_options(reanimated PRIVATE
    -fexceptions
    -frtti
    -Wall
    -Werror)
endif()

target_compile_definitions(reanimated PRIVATE
  "REANIMATED_VERSION=${REANIMATED_VERSION}"
  "REANIMATED_FEATURE_FLAGS=${REANIMATED_FEATURE_FLAGS}")

target_compile_options(reanimated PRIVATE
  -fno-omit-frame-pointer
  -fstack-protector-all
  -fvisibility=hidden
  "$<$<NOT:$<CONFIG:Debug>>:-flto=thin>")

if(REANIMATED_PROFILING)
  target_compile_definitions(reanimated PRIVATE REANIMATED_PROFILING)
endif()

if(IS_REANIMATED_EXAMPLE_APP)
  target_compile_definitions(reanimated PRIVATE IS_REANIMATED_EXAMPLE_APP)
  target_compile_options(reanimated PRIVATE -Wpedantic)
endif()

target_include_directories(
  reanimated
  PRIVATE "${COMMON_CPP_DIR}"
          "${ANDROID_CPP_DIR}"
          "${REACT_NATIVE_DIR}/ReactCommon"
          "${REACT_NATIVE_DIR}/ReactCommon/yoga"
          "${REACT_NATIVE_DIR}/ReactAndroid/src/main/jni/react/turbomodule"
          "${REACT_NATIVE_DIR}/ReactCommon/callinvoker"
          "${REACT_NATIVE_DIR}/ReactCommon/runtimeexecutor"
          "${REACT_NATIVE_DIR}/ReactCommon/jsiexecutor"
          "${REACT_NATIVE_DIR}/ReactCommon/react/renderer/graphics/platform/cxx"
)

target_link_options(reanimated PRIVATE
  "LINKER:--gc-sections"
  "$<$<NOT:$<CONFIG:Debug>>:LINKER:--icf=safe>")

target_link_libraries(
  reanimated
  log
  ReactAndroid::reactnative
  ReactAndroid::jsi
  fbjni::fbjni
  android
  react-native-worklets::worklets)
