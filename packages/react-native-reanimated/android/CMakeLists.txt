project(Reanimated)
cmake_minimum_required(VERSION 3.8)

set (CMAKE_VERBOSE_MAKEFILE ON)
if(${REACT_NATIVE_MINOR_VERSION} GREATER_EQUAL 73)
    set (CMAKE_CXX_STANDARD 20)
else()
    set (CMAKE_CXX_STANDARD 17)
endif()

# default CMAKE_CXX_FLAGS: "-g -DANDROID -fdata-sections -ffunction-sections -funwind-tables -fstack-protector-strong -no-canonical-prefixes -D_FORTIFY_SOURCE=2 -Wformat -Werror=format-security -fstack-protector-all"

include("${REACT_NATIVE_DIR}/ReactAndroid/cmake-utils/folly-flags.cmake")
add_compile_options(${folly_FLAGS})

string(APPEND CMAKE_CXX_FLAGS " -DREACT_NATIVE_MINOR_VERSION=${REACT_NATIVE_MINOR_VERSION} -DREANIMATED_VERSION=${REANIMATED_VERSION} -DHERMES_ENABLE_DEBUGGER=${HERMES_ENABLE_DEBUGGER}")

string(APPEND CMAKE_CXX_FLAGS " -fexceptions -fno-omit-frame-pointer -frtti -fstack-protector-all -std=c++${CMAKE_CXX_STANDARD} -Wall -Werror")

if(${IS_NEW_ARCHITECTURE_ENABLED})
    string(APPEND CMAKE_CXX_FLAGS " -DRCT_NEW_ARCH_ENABLED")
endif()

if(${IS_REANIMATED_EXAMPLE_APP})
    string(APPEND CMAKE_CXX_FLAGS " -DIS_REANIMATED_EXAMPLE_APP -Wpedantic")
endif()

if(NOT ${CMAKE_BUILD_TYPE} MATCHES "Debug")
    string(APPEND CMAKE_CXX_FLAGS " -DNDEBUG")
endif()

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON CACHE INTERNAL "")

set (PACKAGE_NAME "reanimated")
set (BUILD_DIR ${CMAKE_SOURCE_DIR}/build)
set (SRC_DIR ${CMAKE_SOURCE_DIR}/src)
set (COMMON_SRC_DIR "${CMAKE_SOURCE_DIR}/../Common")

file(GLOB_RECURSE SOURCES_COMMON CONFIGURE_DEPENDS "${COMMON_SRC_DIR}/cpp/**.cpp")
file(GLOB_RECURSE SOURCES_ANDROID CONFIGURE_DEPENDS "${SRC_DIR}/main/cpp/**.cpp")

# Consume shared libraries and headers from prefabs
find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)
if(${JS_RUNTIME} STREQUAL "hermes")
    find_package(hermes-engine REQUIRED CONFIG)
endif()

add_library(
        ${PACKAGE_NAME}
        SHARED
        ${SOURCES_COMMON}
        ${SOURCES_ANDROID}
        ${INCLUDE_JSI_CPP}
        ${INCLUDE_JSIDYNAMIC_CPP}
)

# includes

target_include_directories(
        ${PACKAGE_NAME}
        PRIVATE
        "${COMMON_SRC_DIR}/cpp/AnimatedSensor"
        "${COMMON_SRC_DIR}/cpp/Fabric"
        "${COMMON_SRC_DIR}/cpp/hidden_headers"
        "${COMMON_SRC_DIR}/cpp/LayoutAnimations"
        "${COMMON_SRC_DIR}/cpp/NativeModules"
        "${COMMON_SRC_DIR}/cpp/ReanimatedRuntime"
        "${COMMON_SRC_DIR}/cpp/Registries"
        "${COMMON_SRC_DIR}/cpp/SharedItems"
        "${COMMON_SRC_DIR}/cpp/Tools"
        "${SRC_DIR}/main/cpp"
)

target_include_directories(
    ${PACKAGE_NAME}
    PRIVATE
    "${REACT_NATIVE_DIR}/ReactAndroid/src/main/jni/react/turbomodule"
    "${REACT_NATIVE_DIR}/ReactCommon"
    "${REACT_NATIVE_DIR}/ReactCommon/callinvoker"
    "${REACT_NATIVE_DIR}/ReactCommon/react/renderer/graphics/platform/cxx"
    "${REACT_NATIVE_DIR}/ReactCommon/runtimeexecutor"
    "${REACT_NATIVE_DIR}/ReactCommon/yoga"
    "${REACT_NATIVE_DIR}/ReactCommon/react/renderer/componentregistry"
    "${REACT_NATIVE_DIR}/ReactCommon/react/renderer/core"
)

# build shared lib

set_target_properties(${PACKAGE_NAME} PROPERTIES LINKER_LANGUAGE CXX)

target_link_libraries(
    ${PACKAGE_NAME}
    log
    android
)

target_link_libraries(
    ${PACKAGE_NAME}
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
        ${PACKAGE_NAME}
        ${HERMES_LIB}
    )
    if (${HERMES_ENABLE_DEBUGGER})
        set(HERMES_EXECUTOR_LIB ReactAndroid::hermes_executor)
        target_link_libraries(
                ${PACKAGE_NAME}
                ${HERMES_EXECUTOR_LIB}
        )
    endif()
elseif(${JS_RUNTIME} STREQUAL "v8")
    string(APPEND CMAKE_CXX_FLAGS " -DJS_RUNTIME_V8=1")
    target_include_directories(
            ${PACKAGE_NAME}
            PRIVATE
            "${JS_RUNTIME_DIR}/src"
    )
    file (GLOB V8_SO_DIR "${JS_RUNTIME_DIR}/android/build/intermediates/library_jni/*/jni/${ANDROID_ABI}")
    find_library(
            V8EXECUTOR_LIB
            v8executor
            PATHS ${V8_SO_DIR}
            NO_DEFAULT_PATH
            NO_CMAKE_FIND_ROOT_PATH
    )
    target_link_libraries(
            ${PACKAGE_NAME}
            ${V8EXECUTOR_LIB}
    )
elseif(${JS_RUNTIME} STREQUAL "jsc")
    string(APPEND CMAKE_CXX_FLAGS " -DJS_RUNTIME_JSC=1")
    set(JSEXECUTOR_LIB ReactAndroid::jscexecutor)
    target_link_libraries(${PACKAGE_NAME} ${JSEXECUTOR_LIB})
else()
    message(FATAL_ERROR "Unknown JS runtime ${JS_RUNTIME}.")
endif()

if(${IS_NEW_ARCHITECTURE_ENABLED})
    target_link_libraries(
        ${PACKAGE_NAME}
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
set (ignoreMe "${JS_RUNTIME_DIR}")
