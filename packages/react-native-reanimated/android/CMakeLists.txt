project(Reanimated)
cmake_minimum_required(VERSION 3.8)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

set(CMAKE_CXX_STANDARD 20)

# default CMAKE_CXX_FLAGS: "-g -DANDROID -fdata-sections -ffunction-sections
# -funwind-tables -fstack-protector-strong -no-canonical-prefixes
# -D_FORTIFY_SOURCE=2 -Wformat -Werror=format-security -fstack-protector-all"
include("${REACT_NATIVE_DIR}/ReactAndroid/cmake-utils/folly-flags.cmake")
add_compile_options(${folly_FLAGS})

string(
  APPEND
  CMAKE_CXX_FLAGS
  " -DREACT_NATIVE_MINOR_VERSION=${REACT_NATIVE_MINOR_VERSION}\
    -DREANIMATED_VERSION=${REANIMATED_VERSION}\
    -DREANIMATED_FEATURE_FLAGS=\"${REANIMATED_FEATURE_FLAGS}\"")
string(APPEND CMAKE_CXX_FLAGS " -fno-omit-frame-pointer -fstack-protector-all")

if(${REANIMATED_PROFILING})
  string(APPEND CMAKE_CXX_FLAGS " -DREANIMATED_PROFILING")
endif()

if(${IS_REANIMATED_EXAMPLE_APP})
  string(APPEND CMAKE_CXX_FLAGS " -DIS_REANIMATED_EXAMPLE_APP -Wpedantic")
endif()

if(NOT ${CMAKE_BUILD_TYPE} MATCHES "Debug")
  string(APPEND CMAKE_CXX_FLAGS " -DNDEBUG")
endif()

set(BUILD_DIR "${CMAKE_SOURCE_DIR}/build")
set(ANDROID_CPP_DIR "${CMAKE_SOURCE_DIR}/src/main/cpp")
set(COMMON_CPP_DIR "${CMAKE_SOURCE_DIR}/../Common/cpp")

file(GLOB_RECURSE REANIMATED_COMMON_CPP_SOURCES CONFIGURE_DEPENDS
     "${COMMON_CPP_DIR}/reanimated/*.cpp")
file(GLOB_RECURSE REANIMATED_ANDROID_CPP_SOURCES CONFIGURE_DEPENDS
     "${ANDROID_CPP_DIR}/reanimated/*.cpp")

find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)

add_library(reanimated SHARED ${REANIMATED_COMMON_CPP_SOURCES}
                              ${REANIMATED_ANDROID_CPP_SOURCES})

if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 80)
  include(
    "${REACT_NATIVE_DIR}/ReactCommon/cmake-utils/react-native-flags.cmake")
  target_compile_reactnative_options(reanimated PUBLIC)
else()
  string(APPEND CMAKE_CXX_FLAGS
         " -fexceptions -frtti -std=c++${CMAKE_CXX_STANDARD} -Wall -Werror")
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
          "${REACT_NATIVE_WORKLETS_DIR}/Common/cpp"
          "${REACT_NATIVE_WORKLETS_DIR}/android/src/main/cpp")

set_target_properties(reanimated PROPERTIES LINKER_LANGUAGE CXX)

if(${CMAKE_BUILD_TYPE} MATCHES "Debug")
  set(BUILD_TYPE "debug")
else()
  set(BUILD_TYPE "release")
endif()

add_library(worklets SHARED IMPORTED)

set_target_properties(
  worklets
  PROPERTIES
    IMPORTED_LOCATION
    "${REACT_NATIVE_WORKLETS_DIR}/android/build/intermediates/cmake/${BUILD_TYPE}/obj/${ANDROID_ABI}/libworklets.so"
)

set_target_properties(reanimated PROPERTIES LINKER_LANGUAGE CXX)

target_link_libraries(reanimated log ReactAndroid::jsi fbjni::fbjni android
                      worklets)

if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 76)
  target_link_libraries(reanimated ReactAndroid::reactnative)
else()
  target_link_libraries(reanimated ReactAndroid::react_nativemodule_core)
endif()
