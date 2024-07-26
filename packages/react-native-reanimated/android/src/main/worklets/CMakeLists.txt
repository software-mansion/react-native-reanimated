cmake_minimum_required(VERSION 3.8)

set(LOCAL_PACKAGE_NAME "worklets")

file(GLOB_RECURSE WORKLET_COMMON_SOURCES CONFIGURE_DEPENDS "${WORKLET_COMMON_DIR}/*.cpp")

# Consume shared libraries and headers from prefabs
find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)

if(${JS_RUNTIME} STREQUAL "hermes")
    find_package(hermes-engine REQUIRED CONFIG)
endif()

add_library(
    ${LOCAL_PACKAGE_NAME}
    SHARED
    ${WORKLET_COMMON_SOURCES}
    ${INCLUDE_JSI_CPP}
    ${INCLUDE_JSIDYNAMIC_CPP}
    "${ANDROID_SRC_DIR}/main/cpp/AndroidLogger.cpp"
)

# includes
target_include_directories(
    ${LOCAL_PACKAGE_NAME}
    PUBLIC
    "${WORKLET_COMMON_DIR}/hidden_headers"
    "${WORKLET_COMMON_DIR}/Registries"
    "${WORKLET_COMMON_DIR}/SharedItems"
    "${WORKLET_COMMON_DIR}/Tools"
    "${WORKLET_COMMON_DIR}/WorkletRuntime"
)

target_include_directories(
    ${LOCAL_PACKAGE_NAME}
    PRIVATE
    "${ANDROID_SRC_DIR}/main/cpp"
)

target_include_directories(
    ${LOCAL_PACKAGE_NAME}
    PRIVATE
    "${REANIMATED_COMMON_DIR}/NativeModules"
    "${REANIMATED_COMMON_DIR}/AnimatedSensor"
    "${REANIMATED_COMMON_DIR}/Fabric"
    "${REANIMATED_COMMON_DIR}/LayoutAnimations"
    "${REANIMATED_COMMON_DIR}/Tools"
)

target_include_directories(
    ${LOCAL_PACKAGE_NAME}
    PRIVATE
    "${REACT_NATIVE_DIR}/ReactAndroid/src/main/jni/react/turbomodule"
    "${REACT_NATIVE_DIR}/ReactCommon"
    "${REACT_NATIVE_DIR}/ReactCommon/react/nativemodule/core"
    "${REACT_NATIVE_DIR}/ReactCommon/callinvoker"
    "${REACT_NATIVE_DIR}/ReactCommon/react/renderer/graphics/platform/cxx"
    "${REACT_NATIVE_DIR}/ReactCommon/runtimeexecutor"
    "${REACT_NATIVE_DIR}/ReactCommon/yoga"
    "${REACT_NATIVE_DIR}/ReactCommon/react/renderer/componentregistry"
    "${REACT_NATIVE_DIR}/ReactCommon/react/renderer/core"
)

# get_target_property(MY_INC_DIRS ${PACKAGE_NAME} INCLUDE_DIRECTORIES)
# if(MY_INC_DIRS)
# message("Include directories of 'my_target': ${MY_INC_DIRS}")
# else()
# message("There are no include directories for 'my_target'")
# endif()

# build shared lib
set_target_properties(${LOCAL_PACKAGE_NAME} PROPERTIES LINKER_LANGUAGE CXX)

target_link_libraries(
    ${LOCAL_PACKAGE_NAME}
    log
    android
)

target_link_libraries(
    ${LOCAL_PACKAGE_NAME}
    ReactAndroid::folly_runtime
    ReactAndroid::glog
    ReactAndroid::jsi
    ReactAndroid::reactnativejni
    fbjni::fbjni
)

if(${JS_RUNTIME} STREQUAL "hermes")
    string(APPEND CMAKE_CXX_FLAGS " -DJS_RUNTIME_HERMES=1")

    # From prefab from module `com.facebook.react:hermes-android`
    set(HERMES_LIB hermes-engine::libhermes)
    target_link_libraries(
        ${LOCAL_PACKAGE_NAME}
        ${HERMES_LIB}
    )

    if(${HERMES_ENABLE_DEBUGGER})
        set(HERMES_EXECUTOR_LIB ReactAndroid::hermes_executor)
        target_link_libraries(
            ${LOCAL_PACKAGE_NAME}
            ${HERMES_EXECUTOR_LIB}
        )
    endif()
elseif(${JS_RUNTIME} STREQUAL "v8")
    string(APPEND CMAKE_CXX_FLAGS " -DJS_RUNTIME_V8=1")
    target_include_directories(
        ${LOCAL_PACKAGE_NAME}
        PRIVATE
        "${JS_RUNTIME_DIR}/src"
    )
    file(GLOB V8_SO_DIR "${JS_RUNTIME_DIR}/android/build/intermediates/library_jni/*/jni/${ANDROID_ABI}")
    find_library(
        V8EXECUTOR_LIB
        v8executor
        PATHS ${V8_SO_DIR}
        NO_DEFAULT_PATH
        NO_CMAKE_FIND_ROOT_PATH
    )
    target_link_libraries(
        ${LOCAL_PACKAGE_NAME}
        ${V8EXECUTOR_LIB}
    )
elseif(${JS_RUNTIME} STREQUAL "jsc")
    string(APPEND CMAKE_CXX_FLAGS " -DJS_RUNTIME_JSC=1")
    set(JSEXECUTOR_LIB ReactAndroid::jscexecutor)
    target_link_libraries(${LOCAL_PACKAGE_NAME} ${JSEXECUTOR_LIB})
else()
    message(FATAL_ERROR "Unknown JS runtime ${JS_RUNTIME}.")
endif()

if(${IS_NEW_ARCHITECTURE_ENABLED})
    target_link_libraries(
        ${LOCAL_PACKAGE_NAME}
        ReactAndroid::fabricjni
        ReactAndroid::react_debug
        ReactAndroid::react_render_core
        ReactAndroid::react_render_mounting
        ReactAndroid::react_render_componentregistry
        ReactAndroid::react_render_scheduler
        ReactAndroid::react_render_uimanager
        ReactAndroid::rrc_view
    )
endif()

# Resolves "CMake Warning: Manually-specified variables were not used by the project"
# when any of the following variables is not used in some build configuration.
set(ignoreMe "${JS_RUNTIME_DIR}")
