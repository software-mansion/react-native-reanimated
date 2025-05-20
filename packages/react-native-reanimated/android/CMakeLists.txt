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
    -DREANIMATED_PROFILING=${REANIMATED_PROFILING}\
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

set(BUILD_DIR "${CMAKE_SOURCE_DIR}/build")
set(ANDROID_CPP_DIR "${CMAKE_SOURCE_DIR}/src/main/cpp")
set(COMMON_CPP_DIR "${CMAKE_SOURCE_DIR}/../Common/cpp")

file(GLOB_RECURSE REANIMATED_COMMON_CPP_SOURCES CONFIGURE_DEPENDS
     "${COMMON_CPP_DIR}/reanimated/*.cpp")
file(GLOB_RECURSE REANIMATED_ANDROID_CPP_SOURCES CONFIGURE_DEPENDS
     "${ANDROID_CPP_DIR}/reanimated/*.cpp")

find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)
find_package(react-native-worklets REQUIRED CONFIG)

add_library(reanimated SHARED ${REANIMATED_COMMON_CPP_SOURCES}
                              ${REANIMATED_ANDROID_CPP_SOURCES})

target_include_directories(
  reanimated
  PRIVATE "${COMMON_CPP_DIR}"
          "${ANDROID_CPP_DIR}"
          "${REACT_NATIVE_DIR}/ReactCommon"
          "${REACT_NATIVE_DIR}/ReactAndroid/src/main/jni/react/turbomodule"
          "${REACT_NATIVE_DIR}/ReactCommon/callinvoker"
          "${REACT_NATIVE_DIR}/ReactCommon/runtimeexecutor")

if(${IS_NEW_ARCHITECTURE_ENABLED})
  target_include_directories(
    reanimated
    PRIVATE
      "${REACT_NATIVE_DIR}/ReactCommon/yoga"
      "${REACT_NATIVE_DIR}/ReactCommon/react/renderer/graphics/platform/cxx")
endif()

set_target_properties(reanimated PROPERTIES LINKER_LANGUAGE CXX)

target_link_libraries(reanimated log ReactAndroid::jsi fbjni::fbjni android)

target_link_libraries(reanimated react-native-worklets::worklets)

if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 76)
  target_link_libraries(reanimated ReactAndroid::reactnative)
else()
  target_link_libraries(reanimated ReactAndroid::react_nativemodule_core)
endif()
