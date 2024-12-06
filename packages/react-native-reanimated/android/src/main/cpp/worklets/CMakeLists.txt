cmake_minimum_required(VERSION 3.8)

file(GLOB_RECURSE WORKLETS_COMMON_CPP_SOURCES CONFIGURE_DEPENDS "${COMMON_CPP_DIR}/worklets/*.cpp")

# Consume shared libraries and headers from prefabs
find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)

if(${JS_RUNTIME} STREQUAL "hermes")
    find_package(hermes-engine REQUIRED CONFIG)
endif()

add_library(
    worklets
    SHARED
    ${WORKLETS_COMMON_CPP_SOURCES}
)

# includes
target_include_directories(
    worklets
    PUBLIC
    "${COMMON_CPP_DIR}"
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

    if(ReactAndroid_VERSION_MINOR LESS 76)
        target_link_libraries(
            worklets
            ReactAndroid::fabricjni
            ReactAndroid::react_debug
            ReactAndroid::react_render_core
            ReactAndroid::react_render_componentregistry
            ReactAndroid::rrc_view
        )
    endif()
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
    ReactAndroid::jsi
    fbjni::fbjni
)

if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 76)
    target_link_libraries(
        worklets
        ReactAndroid::reactnative
    )
else()
    target_link_libraries(
        worklets
        ReactAndroid::folly_runtime
        ReactAndroid::glog
        ReactAndroid::reactnativejni
    )
endif()

if(${JS_RUNTIME} STREQUAL "hermes")
    target_link_libraries(
        worklets
        hermes-engine::libhermes
    )

    if(${HERMES_ENABLE_DEBUGGER})
        if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 76)
            target_link_libraries(
                worklets
                ReactAndroid::hermestooling
            )
        else()
            target_link_libraries(
                worklets
                ReactAndroid::hermes_executor
            )
        endif()
    endif()
elseif(${JS_RUNTIME} STREQUAL "jsc")
    if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 76)
        target_link_libraries(
            worklets
            ReactAndroid::jsctooling
        )
    else()
        target_link_libraries(
            worklets
            ReactAndroid::jscexecutor
        )
    endif()
elseif(${JS_RUNTIME} STREQUAL "v8")
    # TODO: Refactor this when adding support for newest V8
    target_include_directories(
        worklets
        PRIVATE
        "${JS_RUNTIME_DIR}/src"
    )
    file(GLOB V8_SO_DIR "${JS_RUNTIME_DIR}/android/build/intermediates/library_jni/**/jni/${ANDROID_ABI}")
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
