cmake_minimum_required(VERSION 3.5.1)

set (CMAKE_VERBOSE_MAKEFILE ON)
set (CMAKE_CXX_STANDARD 14)
set (CMAKE_CXX_FLAGS "-DFOLLY_NO_CONFIG=1 -DFOLLY_HAVE_CLOCK_GETTIME=1 -DFOLLY_HAVE_MEMRCHR=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_MOBILE=1 -DON_ANDROID -DONANDROID")

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON CACHE INTERNAL "")

set (PACKAGE_NAME "reanimated")
set (BUILD_DIR ${CMAKE_SOURCE_DIR}/build)
set (NODE_MODULES_DIR "../node_modules")
set (RN_SO_DIR ${NODE_MODULES_DIR}/react-native/ReactAndroid/src/main/jni/first-party/react/jni)
set (FBJNI_HEADERS_DIR ${RN_SO_DIR}/../../fbjni/headers)

# reanimated shared

file(GLOB sources_tools  "./src/main/Common/cpp/Tools/*.cpp")
file(GLOB sources_native_modules  "./src/main/Common/cpp/NativeModules/*.cpp")
file(GLOB sources_shared_items  "./src/main/Common/cpp/SharedItems/*.cpp")
file(GLOB sources_registries  "./src/main/Common/cpp/Registries/*.cpp")
file(GLOB sources_android  "./src/main/cpp/*.cpp")

add_library(
        ${PACKAGE_NAME}
        SHARED
        ${source_tools}
        ${sources_native_modules}
        ${sources_shared_items}
        ${sources_registries}
        ${sources_android}
)

# includes

file (GLOB LIBFBJNI_INCLUDE_DIR ${FBJNI_HEADERS_DIR})

message(WARNING "${BUILD_DIR}/third-party-ndk/boost/boost_${BOOST_VERSION}/boost")

target_include_directories(
        ${PACKAGE_NAME}
        PRIVATE
        ${LIBFBJNI_INCLUDE_DIR}
        ${BUILD_DIR}/third-party-ndk/boost/boost_${BOOST_VERSION}/boost
        ${BUILD_DIR}/third-party-ndk/double-conversion
        ${BUILD_DIR}/third-party-ndk/folly
        ${BUILD_DIR}/third-party-ndk/glog
        "${NODE_MODULES_DIR}/react-native/React"
        "${NODE_MODULES_DIR}/react-native/React/Base"
        "${NODE_MODULES_DIR}/react-native/ReactAndroid/src/main/jni"
        "${NODE_MODULES_DIR}/react-native/ReactAndroid/src/main/java/com/facebook/react/turbomodule/core/jni"
        "${NODE_MODULES_DIR}/react-native/ReactCommon"
        "${NODE_MODULES_DIR}/react-native/ReactCommon/callinvoker"
        "${NODE_MODULES_DIR}/react-native/ReactCommon/jsi"
        "${NODE_MODULES_DIR}/react-native/ReactCommon/jsi"
        "${NODE_MODULES_DIR}/react-native/ReactCommon/turbomodule/core"
        "${NODE_MODULES_DIR}/react-native/ReactCommon/turbomodule"
        "./src/main/Common/cpp/headers/Tools"
        "./src/main/Common/cpp/headers/SpecTools"
        "./src/main/Common/cpp/headers/NativeModules"
        "./src/main/Common/cpp/headers/SharedItems"
        "./src/main/Common/cpp/headers/Registries"
        "./src/main/Common/cpp/hidden_headers"
        "./src/main/cpp/headers"
)

# find libraries

file (GLOB LIBRN_DIR "${RN_SO_DIR}/${ANDROID_ABI}")
file (GLOB LIBJSC_DIR "${RN_SO_DIR}/${ANDROID_ABI}")

message(STATUS "{LIBRN_DIR}: ")
message(STATUS ${LIBRN_DIR})

find_library(
        LOG_LIB
        log
)
find_library(
        FBJNI_LIB
        fbjni
        PATHS ${LIBRN_DIR}
        NO_CMAKE_FIND_ROOT_PATH
)
find_library(
        JSEXECUTOR_LIB
        jscexecutor
        PATHS ${LIBRN_DIR}
        NO_CMAKE_FIND_ROOT_PATH
)
find_library(
        JSC_LIB
        jsc
        PATHS ${LIBJSC_DIR}
        NO_CMAKE_FIND_ROOT_PATH
)
# linking

find_library(
        FBJNI_LIBRARY fbjni
        PATHS ${libfbjni_link_DIRS}
        NO_CMAKE_FIND_ROOT_PATH
)

# build shared lib

set_target_properties(${PACKAGE_NAME} PROPERTIES LINKER_LANGUAGE CXX)

target_link_libraries(
        ${PACKAGE_NAME}
        ${LOG_LIB}
        ${JSEXECUTOR_LIB}
        ${FBJNI_LIB}
        android
)