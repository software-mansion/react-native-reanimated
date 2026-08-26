cmake_minimum_required(VERSION 3.24)
project(la_harness CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

set(REACT_COMMON_DIR
    ${CMAKE_CURRENT_SOURCE_DIR}/../node_modules/react-native/ReactCommon
    CACHE PATH "Path to React Native's ReactCommon sources")
set(REANIMATED_DIR
    ${CMAKE_CURRENT_SOURCE_DIR}/../packages/react-native-reanimated
    CACHE PATH "Path to React Native Reanimated sources")
set(WORKLETS_DIR
    ${CMAKE_CURRENT_SOURCE_DIR}/../packages/react-native-worklets
    CACHE PATH "Path to React Native Worklets sources")

file(
  GLOB hermes_roots
  ${CMAKE_CURRENT_SOURCE_DIR}/../packages/react-native-reanimated-headless-runner/build/hermes/destroot
  ${CMAKE_CURRENT_SOURCE_DIR}/../apps/*/ios/Pods/hermes-engine/destroot
  $ENV{HOME}/Library/Caches/CocoaPods/Pods/External/hermes-engine/*/destroot)
set(default_hermes_root "")
foreach(candidate IN LISTS hermes_roots)
  if(EXISTS
     ${candidate}/Library/Frameworks/macosx/hermesvm.framework/Versions/0/hermesvm
  )
    set(default_hermes_root ${candidate})
    break()
  endif()
endforeach()
set(HERMES_ROOT
    ${default_hermes_root}
    CACHE PATH "Path to a Hermes destroot containing headers and a macOS framework")

include(FetchContent)
include(${CMAKE_CURRENT_SOURCE_DIR}/cmake/folly.cmake)
include(${CMAKE_CURRENT_SOURCE_DIR}/cmake/react_native.cmake)

if(NOT EXISTS ${HERMES_ROOT}/include/hermes/hermes.h)
  message(FATAL_ERROR "HERMES_ROOT does not contain Hermes headers: ${HERMES_ROOT}")
endif()

add_library(hermesvm SHARED IMPORTED)
set_target_properties(
  hermesvm
  PROPERTIES IMPORTED_LOCATION
             ${HERMES_ROOT}/Library/Frameworks/macosx/hermesvm.framework/hermesvm
             INTERFACE_INCLUDE_DIRECTORIES ${HERMES_ROOT}/include)

FetchContent_Declare(
  googletest
  URL https://github.com/google/googletest/archive/refs/tags/v1.15.2.tar.gz
  URL_HASH
    SHA256=7b42b4d6ed48810c5362c265a17faebe90dc2373c885e5216439d37927f02926
  DOWNLOAD_EXTRACT_TIMESTAMP TRUE)
FetchContent_MakeAvailable(googletest)

enable_testing()
include(GoogleTest)

set(harness_uses_proxy_registry OFF)
if(EXISTS ${REANIMATED_DIR}/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxyRegistry.cpp)
  set(harness_uses_proxy_registry ON)
endif()

file(READ
     ${REANIMATED_DIR}/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.h
     layout_animations_proxy_header)
set(harness_starts_proxy_from_shadow_tree OFF)
if(layout_animations_proxy_header MATCHES
   "startSurface\\(const facebook::react::ShadowTree")
  set(harness_starts_proxy_from_shadow_tree ON)
endif()

set(reanimated_layout_animations_sources
  ${REANIMATED_DIR}/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsManager.cpp
  ${REANIMATED_DIR}/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxyCommon.cpp
  ${REANIMATED_DIR}/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxy_Experimental.cpp
  ${REANIMATED_DIR}/Common/cpp/reanimated/LayoutAnimations/PropsDiffer.cpp
  ${REANIMATED_DIR}/Common/cpp/reanimated/LayoutAnimations/SharedTransitions.cpp
  ${REANIMATED_DIR}/Common/cpp/reanimated/Fabric/ShadowTreeCloner.cpp
  src/WorkletsBridge.cpp)

if(NOT harness_uses_proxy_registry)
  list(APPEND reanimated_layout_animations_sources
       ${WORKLETS_DIR}/Common/cpp/worklets/Tools/UIScheduler.cpp)
endif()

if(EXISTS ${REANIMATED_DIR}/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsUtils.cpp)
  list(APPEND reanimated_layout_animations_sources
       ${REANIMATED_DIR}/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsUtils.cpp)
endif()

if(harness_uses_proxy_registry)
  list(APPEND reanimated_layout_animations_sources
       ${REANIMATED_DIR}/Common/cpp/reanimated/LayoutAnimations/LayoutAnimationsProxyRegistry.cpp)
endif()

function(add_layout_animation_variant name)
  add_library(
    harness_runtime_${name} STATIC src/Choreographer.cpp src/PlatformDriver.cpp
                                   src/Tree.cpp src/UIManagerBridge.cpp
                                   ${REANIMATED_DIR}/Common/NativeView/react/renderer/components/rnreanimated/REASharedTransitionBoundaryShadowNode.cpp)
  target_include_directories(
    harness_runtime_${name}
    PUBLIC include ${REANIMATED_DIR}/Common/NativeView)
  target_link_libraries(harness_runtime_${name}
                        PUBLIC react_native_mounting_${name})

  add_library(reanimated_layout_animations_${name} STATIC
              ${reanimated_layout_animations_sources})
  target_include_directories(
    reanimated_layout_animations_${name}
    PUBLIC include ${REANIMATED_DIR}/Common/cpp ${WORKLETS_DIR}/Common/cpp)
  target_link_libraries(reanimated_layout_animations_${name}
                        PUBLIC react_native_mounting_${name} hermesvm)

  add_library(layout_animation_harness_${name} STATIC
              src/AnimationHarness.cpp)
  target_include_directories(layout_animation_harness_${name} PUBLIC include)
  target_link_libraries(
    layout_animation_harness_${name}
    PUBLIC harness_runtime_${name} reanimated_layout_animations_${name})

  if(harness_uses_proxy_registry)
    target_compile_definitions(reanimated_layout_animations_${name}
                               PUBLIC HARNESS_PROXY_REGISTRY=1)
  endif()

  if(harness_starts_proxy_from_shadow_tree)
    target_compile_definitions(layout_animation_harness_${name}
                               PRIVATE HARNESS_PROXY_SHADOW_TREE_START=1)
  endif()

  if(name STREQUAL android)
    target_compile_definitions(reanimated_layout_animations_${name}
                               PRIVATE ANDROID=1)
    target_compile_definitions(layout_animation_harness_${name}
                               PRIVATE ANDROID=1)
  endif()
endfunction()

add_layout_animation_variant(ios)
add_layout_animation_variant(android)

set(harness_test_sources
    tests/FoundationTest.cpp tests/LayoutAnimationScenariosTest.cpp
    tests/ProxySmokeTest.cpp tests/SmokeTest.cpp)

foreach(platform ios android)
  add_executable(harness_${platform}_tests ${harness_test_sources})
  target_link_libraries(
    harness_${platform}_tests
    PRIVATE layout_animation_harness_${platform} GTest::gtest_main)
  set_target_properties(
    harness_${platform}_tests
    PROPERTIES BUILD_RPATH
               ${HERMES_ROOT}/Library/Frameworks/macosx/hermesvm.framework)
  if(platform STREQUAL android)
    target_compile_definitions(harness_${platform}_tests
                               PRIVATE HARNESS_PLATFORM_ANDROID=1)
  endif()
  gtest_discover_tests(harness_${platform}_tests
                       TEST_PREFIX ${platform}.)
endforeach()
