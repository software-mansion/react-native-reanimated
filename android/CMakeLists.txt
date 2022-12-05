project(Reanimated)
cmake_minimum_required(VERSION 3.8)

set (CMAKE_VERBOSE_MAKEFILE ON)
set (CMAKE_CXX_STANDARD 17)

# default CMAKE_CXX_FLAGS: "-g -DANDROID -fdata-sections -ffunction-sections -funwind-tables -fstack-protector-strong -no-canonical-prefixes -D_FORTIFY_SOURCE=2 -Wformat -Werror=format-security -fstack-protector-all"

include("${REACT_NATIVE_DIR}/ReactAndroid/cmake-utils/folly-flags.cmake")
string(REPLACE ";" " " folly_FLAGS ${folly_FLAGS}) # input is a semicolon-separated list
string(APPEND CMAKE_CXX_FLAGS " ${folly_FLAGS}")

string(APPEND CMAKE_CXX_FLAGS " -DREACT_NATIVE_MINOR_VERSION=${REACT_NATIVE_MINOR_VERSION} -DREANIMATED_VERSION=${REANIMATED_VERSION} -DHERMES_ENABLE_DEBUGGER=${HERMES_ENABLE_DEBUGGER}")

string(APPEND CMAKE_CXX_FLAGS " -fexceptions -fno-omit-frame-pointer -frtti -Wno-sign-compare -std=c++17 -Wall -Werror")

if(${IS_NEW_ARCHITECTURE_ENABLED})
    string(APPEND CMAKE_CXX_FLAGS " -DRCT_NEW_ARCH_ENABLED")
endif()

if(${CMAKE_BUILD_TYPE} STREQUAL "Debug")
    string(APPEND CMAKE_CXX_FLAGS " -DDEBUG")
endif()

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON CACHE INTERNAL "")

set (PACKAGE_NAME "reanimated")
set (BUILD_DIR ${CMAKE_SOURCE_DIR}/build)
set (SRC_DIR ${CMAKE_SOURCE_DIR}/src)
set (COMMON_SRC_DIR "${CMAKE_SOURCE_DIR}/../Common")

file(GLOB_RECURSE SOURCES_COMMON CONFIGURE_DEPENDS "${COMMON_SRC_DIR}/cpp/**.cpp")
file(GLOB_RECURSE SOURCES_ANDROID CONFIGURE_DEPENDS "${SRC_DIR}/main/cpp/**.cpp")

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
)

# includes

target_include_directories(
        ${PACKAGE_NAME}
        PRIVATE
        "${REACT_NATIVE_DIR}/ReactAndroid/src/main/jni"
        "${REACT_NATIVE_DIR}/ReactAndroid/src/main/jni/react/turbomodule" # CallInvokerHolder.h on 0.71.0-rc.0
        "${REACT_NATIVE_DIR}/ReactCommon"
        "${REACT_NATIVE_DIR}/ReactCommon/callinvoker"
        "${REACT_NATIVE_DIR}/ReactCommon/runtimeexecutor" # RuntimeExecutor.h
        "${REACT_NATIVE_DIR}/ReactCommon/react/renderer/graphics/platform/cxx" # Float.h
        "${REACT_NATIVE_DIR}/ReactCommon/yoga" # YGStyle.h
        "${COMMON_SRC_DIR}/cpp/Tools"
        "${COMMON_SRC_DIR}/cpp/SpecTools"
        "${COMMON_SRC_DIR}/cpp/NativeModules"
        "${COMMON_SRC_DIR}/cpp/SharedItems"
        "${COMMON_SRC_DIR}/cpp/ReanimatedRuntime"
        "${COMMON_SRC_DIR}/cpp/Registries"
        "${COMMON_SRC_DIR}/cpp/LayoutAnimations"
        "${COMMON_SRC_DIR}/cpp/AnimatedSensor"
        "${COMMON_SRC_DIR}/cpp/Fabric"
        "${COMMON_SRC_DIR}/cpp/hidden_headers"
        "${SRC_DIR}/main/cpp"
)

find_library(
        LOG_LIB
        log
)

# build shared lib

set_target_properties(${PACKAGE_NAME} PROPERTIES LINKER_LANGUAGE CXX)


target_link_libraries(
    ${PACKAGE_NAME}
    ${LOG_LIB}
    ReactAndroid::jsi
    ReactAndroid::glog
    fbjni::fbjni
    ReactAndroid::folly_runtime
    ReactAndroid::reactnativejni
    android
)

if(${JS_RUNTIME} STREQUAL "hermes")
    string(APPEND CMAKE_CXX_FLAGS " -DJS_RUNTIME_HERMES=1")
    if(${REACT_NATIVE_MINOR_VERSION} LESS 69)
        # From `hermes-engine` npm package
        target_include_directories(
            ${PACKAGE_NAME}
            PRIVATE
            "${JS_RUNTIME_DIR}/android/include"
        )
    else()
        # Bundled Hermes from module `com.facebook.react:hermes-engine` or project `:ReactAndroid:hermes-engine`
        target_include_directories(
            ${PACKAGE_NAME}
            PRIVATE
            "${JS_RUNTIME_DIR}/API"
            "${JS_RUNTIME_DIR}/public"
        )
    endif()
    if (${HERMES_ENABLE_DEBUGGER})
        target_link_libraries(
                ${PACKAGE_NAME}
                ReactAndroid::hermes_executor
        )
    endif()
    target_link_libraries(
            ${PACKAGE_NAME}
            hermes-engine::libhermes
    )
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
            NO_CMAKE_FIND_ROOT_PATH
    )
    target_link_libraries(
            ${PACKAGE_NAME}
            ${V8EXECUTOR_LIB}
    )
elseif(${JS_RUNTIME} STREQUAL "jsc")
    string(APPEND CMAKE_CXX_FLAGS " -DJS_RUNTIME_JSC=1")
    target_link_libraries(
            ${PACKAGE_NAME}
            ReactAndroid::jscexecutor
    )
else()
    message(FATAL_ERROR "Unknown JS runtime")
endif()

if(${IS_NEW_ARCHITECTURE_ENABLED})
    target_link_libraries(
            ${PACKAGE_NAME}
            ReactAndroid::react_nativemodule_core
            ReactAndroid::react_render_componentregistry
            ReactAndroid::react_render_core
            ReactAndroid::react_debug
            ReactAndroid::react_render_debug
            ReactAndroid::rrc_view
            ReactAndroid::fabricjni
            ReactAndroid::react_render_scheduler
            ReactAndroid::react_render_uimanager
            ReactAndroid::react_render_mounting
    )
endif()

if(${REACT_NATIVE_MINOR_VERSION} LESS 64)
    add_library(
            turbomodulejsijni
            # Sets the library as a shared library.
            SHARED
            # Provides a relative path to your source file(s).
            ./empty.cpp
    )
endif()

# Resolves "CMake Warning: Manually-specified variables were not used by the project"
# when any of the following variables is not used in some build configuration.
set (ignoreMe "${CLIENT_SIDE_BUILD}")
set (ignoreMe "${JS_RUNTIME_DIR}")
set (ignoreMe "${PLAYGROUND_APP_NAME}")
set (ignoreMe "${REANIMATED_PACKAGE_BUILD}")
