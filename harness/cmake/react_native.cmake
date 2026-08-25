# React Native's shipped CMake targets assume the Android prefab layout. The
# harness builds the required ReactCommon sources directly for each props ABI.

add_subdirectory(${REACT_COMMON_DIR}/yoga/yoga ${CMAKE_BINARY_DIR}/yoga)

file(
  GLOB fbjni_include_candidates
  $ENV{HOME}/.gradle/caches/*/transforms/*/transformed/fbjni-*/prefab/modules/fbjni/include)
set(default_fbjni_include_dir "")
if(fbjni_include_candidates)
  list(GET fbjni_include_candidates 0 default_fbjni_include_dir)
endif()
set(FBJNI_INCLUDE_DIR
    ${default_fbjni_include_dir}
    CACHE PATH "Path containing fbjni/fbjni.h")

file(GLOB java_home_candidates /Library/Java/JavaVirtualMachines/*/Contents/Home)
set(default_java_home "")
if(java_home_candidates)
  list(GET java_home_candidates 0 default_java_home)
endif()
set(JAVA_HOME_DIR
    ${default_java_home}
    CACHE PATH "JDK home used for Android host headers")

if(NOT EXISTS ${FBJNI_INCLUDE_DIR}/fbjni/fbjni.h)
  message(FATAL_ERROR "FBJNI_INCLUDE_DIR does not contain fbjni/fbjni.h")
endif()
if(NOT EXISTS ${JAVA_HOME_DIR}/include/jni.h)
  message(FATAL_ERROR "JAVA_HOME_DIR does not contain include/jni.h")
endif()

file(GLOB_RECURSE fbjni_host_sources ${FBJNI_INCLUDE_DIR}/fbjni/*.cpp)
list(APPEND fbjni_host_sources ${FBJNI_INCLUDE_DIR}/lyra/cxa_throw.cpp
     ${FBJNI_INCLUDE_DIR}/lyra/lyra.cpp
     ${FBJNI_INCLUDE_DIR}/lyra/lyra_exceptions.cpp)
add_library(fbjni_host STATIC ${fbjni_host_sources})
target_include_directories(
  fbjni_host SYSTEM
  PUBLIC ${FBJNI_INCLUDE_DIR} ${JAVA_HOME_DIR}/include
         ${JAVA_HOME_DIR}/include/darwin)

file(
  GLOB
  react_native_mounting_sources
  CONFIGURE_DEPENDS
  ${REACT_COMMON_DIR}/jserrorhandler/ErrorUtils.cpp
  ${REACT_COMMON_DIR}/jsi/jsi/JSIDynamic.cpp
  ${REACT_COMMON_DIR}/jsi/jsi/jsi.cpp
  ${REACT_COMMON_DIR}/jsinspector-modern/ConsoleTask*.cpp
  ${REACT_COMMON_DIR}/jsinspector-modern/network/CdpNetwork.cpp
  ${REACT_COMMON_DIR}/jsinspector-modern/network/HttpUtils.cpp
  ${REACT_COMMON_DIR}/jsinspector-modern/tracing/*.cpp
  ${REACT_COMMON_DIR}/logger/*.cpp
  ${REACT_COMMON_DIR}/oscompat/OSCompatPosix.cpp
  ${REACT_COMMON_DIR}/react/debug/*.cpp
  ${REACT_COMMON_DIR}/react/featureflags/*.cpp
  ${REACT_COMMON_DIR}/react/performance/timeline/*.cpp
  ${REACT_COMMON_DIR}/react/renderer/componentregistry/*.cpp
  ${REACT_COMMON_DIR}/react/renderer/components/legacyviewmanagerinterop/*.cpp
  ${REACT_COMMON_DIR}/react/renderer/components/root/*.cpp
  ${REACT_COMMON_DIR}/react/renderer/components/scrollview/*.cpp
  ${REACT_COMMON_DIR}/react/renderer/components/view/*.cpp
  ${REACT_COMMON_DIR}/react/renderer/consistency/*.cpp
  ${REACT_COMMON_DIR}/react/renderer/core/*.cpp
  ${REACT_COMMON_DIR}/react/renderer/debug/*.cpp
  ${REACT_COMMON_DIR}/react/renderer/graphics/*.cpp
  ${REACT_COMMON_DIR}/react/renderer/mounting/*.cpp
  ${REACT_COMMON_DIR}/react/renderer/mounting/internal/*.cpp
  ${REACT_COMMON_DIR}/react/renderer/mounting/stubs/*.cpp
  ${REACT_COMMON_DIR}/react/renderer/runtimescheduler/*.cpp
  ${REACT_COMMON_DIR}/react/renderer/telemetry/*.cpp
  ${REACT_COMMON_DIR}/react/renderer/uimanager/consistency/LazyShadowTreeRevisionConsistencyManager.cpp
  ${REACT_COMMON_DIR}/react/utils/*.cpp
  ${REACT_COMMON_DIR}/reactperflogger/reactperflogger/*.cpp
  ${REACT_COMMON_DIR}/runtimeexecutor/platform/cxx/ReactCommon/*.cpp)

function(add_react_native_mounting_variant name platform)
  set(platform_sources)
  if(platform STREQUAL android)
    list(
      APPEND
      platform_sources
      ${REACT_COMMON_DIR}/react/renderer/components/scrollview/platform/android/react/renderer/components/scrollview/HostPlatformScrollViewProps.cpp
      ${REACT_COMMON_DIR}/react/renderer/components/view/platform/android/react/renderer/components/view/HostPlatformViewProps.cpp
      ${REACT_COMMON_DIR}/react/renderer/graphics/platform/android/react/renderer/graphics/configurePlatformColorCacheInvalidationHook.cpp
      ${REACT_COMMON_DIR}/react/renderer/mapbuffer/MapBuffer.cpp
      ${REACT_COMMON_DIR}/react/renderer/mapbuffer/MapBufferBuilder.cpp)
  endif()

  add_library(react_native_mounting_${name} STATIC
              ${react_native_mounting_sources} ${platform_sources})
  target_include_directories(
    react_native_mounting_${name}
    SYSTEM
    PUBLIC ${REACT_COMMON_DIR}
           ${REACT_COMMON_DIR}/callinvoker
           ${REACT_COMMON_DIR}/jsi
           ${REACT_COMMON_DIR}/react/renderer/components/scrollview/platform/${platform}
           ${REACT_COMMON_DIR}/react/renderer/components/view/platform/${platform}
           ${REACT_COMMON_DIR}/react/renderer/graphics/platform/${platform}
           ${REACT_COMMON_DIR}/react/utils/platform/cxx
           ${REACT_COMMON_DIR}/reactperflogger
           ${REACT_COMMON_DIR}/runtimeexecutor
           ${REACT_COMMON_DIR}/runtimeexecutor/platform/cxx)
  target_compile_definitions(
    react_native_mounting_${name}
    PUBLIC RN_SHADOW_TREE_INTROSPECTION=1 LOG_TAG="ReactNative")
  if(platform STREQUAL android)
    target_include_directories(
      react_native_mounting_${name}
      SYSTEM
      PUBLIC ${FBJNI_INCLUDE_DIR} ${JAVA_HOME_DIR}/include
             ${JAVA_HOME_DIR}/include/darwin)
    target_compile_definitions(react_native_mounting_${name}
                               PUBLIC ANDROID=1 RN_SERIALIZABLE_STATE=1)
  endif()
  target_link_libraries(react_native_mounting_${name}
                        PUBLIC folly_runtime yogacore)
  if(platform STREQUAL android)
    target_link_libraries(react_native_mounting_${name} PUBLIC fbjni_host)
  endif()
endfunction()

add_react_native_mounting_variant(ios cxx)
add_react_native_mounting_variant(android android)
