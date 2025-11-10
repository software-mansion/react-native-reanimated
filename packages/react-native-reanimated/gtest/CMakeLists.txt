cmake_minimum_required(VERSION 3.14)
project(ReanimatedCommonTests)

# GoogleTest requires at least C++17
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

message(WARNING "dddddddd ${ANDROID_NDK} ${CMAKE_TOOLCHAIN_FILE}")

include(FetchContent)
FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/03597a01ee50ed33e9dfd640b249b4be3799d395.zip
)

# For Windows: Prevent overriding the parent project's compiler/linker settings
set(gtest_force_shared_crt ON CACHE BOOL "" FORCE)

FetchContent_MakeAvailable(googletest)

enable_testing()


set(COMMON_CPP_DIR "${CMAKE_SOURCE_DIR}/../cpp")

# file(GLOB_RECURSE COMMON_CPP_SOURCES 
#   CONFIGURE_DEPENDS
#   "${COMMON_CPP_DIR}/reanimated/*.cpp"
# )

file(GLOB_RECURSE TEST_SOURCES 
  CONFIGURE_DEPENDS
  "${CMAKE_SOURCE_DIR}/*.cpp"
)

add_executable(run_tests
  ${TEST_SOURCES}
)

add_library(reanimated SHARED IMPORTED)

set_target_properties(
  reanimated
  PROPERTIES
    IMPORTED_LOCATION
    "${CMAKE_SOURCE_DIR}/../android/build/intermediates/cmake/${BUILD_TYPE}/obj/${ANDROID_ABI}/libreanimated.so"
)

target_link_libraries(run_tests PRIVATE
  reanimated
  GTest::gtest_main
)

# if(NOT DEFINED REACT_NATIVE_DIR)
#   message(FATAL_ERROR "REACT_NATIVE_DIR not defined.")
# endif()

target_include_directories(run_tests PRIVATE
  "${CMAKE_SOURCE_DIR}/../Common/cpp"
  # "${REACT_NATIVE_DIR}/ReactCommon"
  # "${REACT_NATIVE_DIR}/ReactCommon/yoga"
  # "${REACT_NATIVE_DIR}/ReactAndroid/src/main/jni/react/turbomodule"
  # "${REACT_NATIVE_DIR}/ReactCommon/callinvoker"
  # "${REACT_NATIVE_DIR}/ReactCommon/runtimeexecutor"
  # "${REACT_NATIVE_DIR}/ReactCommon/jsiexecutor"
  # "${REACT_NATIVE_DIR}/ReactCommon/react/renderer/graphics/platform/cxx"
  # "${REACT_NATIVE_DIR}/ReactCommon/third-party-podspecs/glog"
  # "${REACT_NATIVE_DIR}/ReactCommon/react/debug"
  # "${REACT_NATIVE_DIR}/ReactCommon/jsi"
)

include(GoogleTest)
gtest_discover_tests(run_tests)


message(WARNING "FFFFFFFFFFFFF")