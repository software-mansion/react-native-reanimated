cmake_minimum_required(VERSION 3.8)

file(GLOB_RECURSE WORKLETS_COMMON_SOURCES CONFIGURE_DEPENDS "${WORKLETS_COMMON_DIR}/*.cpp")

# Consume shared libraries and headers from prefabs
find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)

if(${JS_RUNTIME} STREQUAL "hermes")
    find_package(hermes-engine REQUIRED CONFIG)
endif()

add_library(
    worklets
    SHARED
    ${WORKLETS_COMMON_SOURCES}
    "${ANDROID_SRC_DIR}/main/cpp/PlatformLogger.cpp"
)

# includes
target_include_directories(
    worklets
    PUBLIC
    "${WORKLETS_COMMON_DIR}/Registries"
    "${WORKLETS_COMMON_DIR}/SharedItems"
    "${WORKLETS_COMMON_DIR}/Tools"
    "${WORKLETS_COMMON_DIR}/WorkletRuntime"
)

target_include_directories(
    worklets
    PRIVATE
    "${ANDROID_SRC_DIR}/main/cpp"
)

target_include_directories(
    worklets
    PRIVATE
    "${REANIMATED_COMMON_DIR}/NativeModules"
    "${REANIMATED_COMMON_DIR}/AnimatedSensor"
    "${REANIMATED_COMMON_DIR}/Fabric"
    "${REANIMATED_COMMON_DIR}/LayoutAnimations"
    "${REANIMATED_COMMON_DIR}/Tools"
)

target_include_directories(
    worklets
    PRIVATE
    "${REACT_NATIVE_DIR}/ReactCommon"
    "${REACT_NATIVE_DIR}/ReactCommon/callinvoker"
    "${REACT_NATIVE_DIR}/ReactCommon/runtimeexecutor"
)

if(${IS_NEW_ARCHITECTURE_ENABLED})
    target_include_directories(
        worklets
        PRIVATE
        "${REACT_NATIVE_DIR}/ReactCommon/yoga"
        "${REACT_NATIVE_DIR}/ReactCommon/react/renderer/graphics/platform/cxx"
    )

    target_link_libraries(
        worklets
        ReactAndroid::fabricjni
        ReactAndroid::react_debug
        ReactAndroid::react_render_core
        ReactAndroid::react_render_componentregistry
        ReactAndroid::rrc_view
    )
endif()

# build shared lib
set_target_properties(
    worklets
    PROPERTIES
    LINKER_LANGUAGE
    CXX
)

target_link_libraries(
    worklets
    log
    ReactAndroid::folly_runtime
    ReactAndroid::glog
    ReactAndroid::jsi
    ReactAndroid::reactnativejni
    fbjni::fbjni
)

if(${JS_RUNTIME} STREQUAL "hermes")
    target_link_libraries(
        worklets
        hermes-engine::libhermes
    )

    if(${HERMES_ENABLE_DEBUGGER})
        target_link_libraries(
            worklets
            ReactAndroid::hermes_executor
        )
    endif()
elseif(${JS_RUNTIME} STREQUAL "jsc")
    target_link_libraries(
        worklets
        ReactAndroid::jscexecutor
    )
elseif(${JS_RUNTIME} STREQUAL "v8")
    # TODO: Refactor this when adding support for newest V8
    target_include_directories(
        worklets
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
        worklets
        ${V8EXECUTOR_LIB}
    )
endif()
