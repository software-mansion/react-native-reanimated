cmake_minimum_required(VERSION 3.8)

file(GLOB_RECURSE REANIMATED_COMMON_CPP_SOURCES CONFIGURE_DEPENDS
     "${COMMON_CPP_DIR}/reanimated/*.cpp")
file(GLOB_RECURSE REANIMATED_ANDROID_CPP_SOURCES CONFIGURE_DEPENDS
     "${ANDROID_CPP_DIR}/reanimated/*.cpp")

find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)
if(${HAS_EXTERNAL_WORKLETS})
  find_package(react-native-worklets REQUIRED CONFIG)
endif()

add_library(reanimated SHARED ${REANIMATED_COMMON_CPP_SOURCES}
                              ${REANIMATED_ANDROID_CPP_SOURCES})

if(${JS_RUNTIME} STREQUAL "hermes")
  find_package(hermes-engine REQUIRED CONFIG)
endif()

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

target_link_libraries(reanimated log ReactAndroid::jsi fbjni::fbjni)

if(${HAS_EXTERNAL_WORKLETS})
  target_link_libraries(reanimated react-native-worklets::worklets)
else()
  target_link_libraries(reanimated worklets)
endif()

if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 76)
  target_link_libraries(reanimated ReactAndroid::reactnative)
else()
  target_link_libraries(reanimated ReactAndroid::react_nativemodule_core)
endif()

if(${JS_RUNTIME} STREQUAL "hermes")
  target_link_libraries(reanimated hermes-engine::libhermes)

  if(${HERMES_ENABLE_DEBUGGER})
    if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 76)
      target_link_libraries(reanimated ReactAndroid::hermestooling)
    else()
      target_link_libraries(reanimated ReactAndroid::hermes_executor)
    endif()
  endif()
elseif(${JS_RUNTIME} STREQUAL "jsc")
  if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 76)
    target_link_libraries(reanimated ReactAndroid::jsctooling)
  else()
    target_link_libraries(reanimated ReactAndroid::jscexecutor)
  endif()
elseif(${JS_RUNTIME} STREQUAL "v8")
  # TODO: Refactor this when adding support for newest V8
  target_include_directories(reanimated PRIVATE "${JS_RUNTIME_DIR}/src")
  file(GLOB V8_SO_DIR "${JS_RUNTIME_DIR}/android/build/intermediates/\
    library_jni/**/jni/${ANDROID_ABI}")
  find_library(
    V8EXECUTOR_LIB v8executor
    PATHS ${V8_SO_DIR}
    NO_DEFAULT_PATH NO_CMAKE_FIND_ROOT_PATH)
  target_link_libraries(reanimated ${V8EXECUTOR_LIB})
endif()
