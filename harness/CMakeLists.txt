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
    CACHE PATH "Legacy Hermes destroot")
set(HERMES_INCLUDE_DIR
    ""
    CACHE PATH "Path containing hermes/hermes.h")
set(HERMES_LIBRARY
    ""
    CACHE FILEPATH "Path to the Hermes shared library")

if(NOT HERMES_INCLUDE_DIR AND HERMES_ROOT)
  set(HERMES_INCLUDE_DIR ${HERMES_ROOT}/include)
endif()
if(NOT HERMES_LIBRARY AND HERMES_ROOT)
  if(APPLE)
    set(HERMES_LIBRARY
        ${HERMES_ROOT}/Library/Frameworks/macosx/hermesvm.framework/hermesvm)
  else()
    set(HERMES_LIBRARY ${HERMES_ROOT}/lib/libhermesvm${CMAKE_SHARED_LIBRARY_SUFFIX})
  endif()
endif()

include(FetchContent)
include(${CMAKE_CURRENT_SOURCE_DIR}/cmake/folly.cmake)
include(${CMAKE_CURRENT_SOURCE_DIR}/cmake/react_native.cmake)

if(NOT EXISTS ${HERMES_INCLUDE_DIR}/hermes/hermes.h)
  message(FATAL_ERROR
          "HERMES_INCLUDE_DIR does not contain hermes/hermes.h: ${HERMES_INCLUDE_DIR}")
endif()
if(NOT EXISTS ${HERMES_LIBRARY})
  message(FATAL_ERROR "HERMES_LIBRARY does not exist: ${HERMES_LIBRARY}")
endif()

add_library(hermesvm SHARED IMPORTED)
set_target_properties(
  hermesvm
  PROPERTIES IMPORTED_LOCATION ${HERMES_LIBRARY}
             INTERFACE_INCLUDE_DIRECTORIES ${HERMES_INCLUDE_DIR})
get_filename_component(HERMES_LIBRARY_DIR ${HERMES_LIBRARY} DIRECTORY)

option(HARNESS_USE_SYSTEM_GTEST "Use a preinstalled GTest package" OFF)
if(HARNESS_USE_SYSTEM_GTEST)
  find_package(GTest CONFIG REQUIRED)
else()
  FetchContent_Declare(
    googletest
    URL https://github.com/google/googletest/archive/refs/tags/v1.15.2.tar.gz
    URL_HASH
      SHA256=7b42b4d6ed48810c5362c265a17faebe90dc2373c885e5216439d37927f02926
    DOWNLOAD_EXTRACT_TIMESTAMP TRUE)
  FetchContent_MakeAvailable(googletest)
endif()

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

file(READ
     ${REACT_COMMON_DIR}/react/renderer/uimanager/UIManagerDelegate.h
     ui_manager_delegate_header)
set(harness_uses_new_ui_manager_delegate OFF)
if(ui_manager_delegate_header MATCHES
   "uiManagerShouldAddOnSurfaceStartCallback")
  set(harness_uses_new_ui_manager_delegate ON)
endif()

file(READ ${REACT_COMMON_DIR}/react/renderer/core/LayoutPrimitives.h
     layout_primitives_header)
set(harness_supports_grid_display OFF)
if(layout_primitives_header MATCHES "Grid =")
  set(harness_supports_grid_display ON)
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
  if(harness_uses_new_ui_manager_delegate)
    target_compile_definitions(harness_runtime_${name}
                               PUBLIC HARNESS_NEW_UI_MANAGER_DELEGATE=1)
  endif()
  if(harness_supports_grid_display)
    target_compile_definitions(harness_runtime_${name}
                               PUBLIC HARNESS_GRID_DISPLAY=1)
  endif()

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

  if(CMAKE_SYSTEM_NAME STREQUAL "Linux" AND name STREQUAL ios)
    target_compile_options(
      reanimated_layout_animations_${name}
      PRIVATE -include ${CMAKE_CURRENT_SOURCE_DIR}/include/harness/ReanimatedHostPlatform.h)
    target_compile_options(
      layout_animation_harness_${name}
      PRIVATE -include ${CMAKE_CURRENT_SOURCE_DIR}/include/harness/ReanimatedHostPlatform.h)
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
    tests/ProxySmokeTest.cpp tests/SmokeTest.cpp tests/TestMain.cpp)

foreach(platform ios android)
  add_executable(harness_${platform}_tests ${harness_test_sources})
  target_link_libraries(
    harness_${platform}_tests
    PRIVATE layout_animation_harness_${platform} GTest::gtest)
  set_target_properties(
    harness_${platform}_tests
    PROPERTIES BUILD_RPATH ${HERMES_LIBRARY_DIR})
  if(platform STREQUAL android)
    target_compile_definitions(harness_${platform}_tests
                               PRIVATE HARNESS_PLATFORM_ANDROID=1)
  endif()
  gtest_discover_tests(harness_${platform}_tests
                       TEST_PREFIX ${platform}.)
endforeach()
