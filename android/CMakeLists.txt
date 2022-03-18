cmake_minimum_required(VERSION 3.5.1)

set (CMAKE_VERBOSE_MAKEFILE ON)
set (CMAKE_CXX_STANDARD 14)
set (CMAKE_CXX_FLAGS "-DFOLLY_NO_CONFIG=1 -DFOLLY_HAVE_CLOCK_GETTIME=1 -DFOLLY_HAVE_MEMRCHR=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_MOBILE=1 -DON_ANDROID -DONANDROID -DFOR_HERMES=${FOR_HERMES} -fexceptions -fno-omit-frame-pointer -frtti -Wno-sign-compare")

if(${NATIVE_DEBUG})
    set(CMAKE_C_FLAGS_DEBUG "${CMAKE_C_FLAGS_DEBUG} -g")
    set(CMAKE_CXX_FLAGS_DEBUG "${CMAKE_CXX_FLAGS_DEBUG} -g")
endif()

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON CACHE INTERNAL "")

set (PACKAGE_NAME "reanimated")
set (SRC_DIR ${CMAKE_SOURCE_DIR}/src)

if(${CLIENT_SIDE_BUILD})
    set (NODE_MODULES_DIR "${CMAKE_SOURCE_DIR}/../../")
    set (COMMON_SRC_DIR "${CMAKE_SOURCE_DIR}/../Common")
else()
    set (NODE_MODULES_DIR "../node_modules")
    set (COMMON_SRC_DIR "${SRC_DIR}/main/Common")
endif()

set (RN_SO_DIR ${NODE_MODULES_DIR}/react-native/ReactAndroid/src/main/jni/first-party/react/jni)
set (FBJNI_HEADERS_DIR ${RN_SO_DIR}/../../fbjni/headers)

# reanimated shared

file(GLOB sources_tools  "${COMMON_SRC_DIR}/cpp/Tools/*.cpp")
file(GLOB sources_native_modules  "${COMMON_SRC_DIR}/cpp/NativeModules/*.cpp")
file(GLOB sources_shared_items  "${COMMON_SRC_DIR}/cpp/SharedItems/*.cpp")
file(GLOB sources_registries  "${COMMON_SRC_DIR}/cpp/Registries/*.cpp")
file(GLOB sources_android  "${SRC_DIR}/main/cpp/*.cpp")

if(${REACT_NATIVE_TARGET_VERSION} LESS 66)
        set (
                INCLUDE_JSI_CPP
                "${NODE_MODULES_DIR}/react-native/ReactCommon/jsi/jsi/jsi.cpp"
        )
        set (
                INCLUDE_JSIDYNAMIC_CPP
                "${NODE_MODULES_DIR}/react-native/ReactCommon/jsi/jsi/JSIDynamic.cpp"
        )
endif()

add_library(
        ${PACKAGE_NAME}
        SHARED
        ${sources_native_modules}
        ${sources_shared_items}
        ${sources_registries}
        ${sources_android}
        ${source_tools}
        ${INCLUDE_JSI_CPP}
        ${INCLUDE_JSIDYNAMIC_CPP}
        "${COMMON_SRC_DIR}/cpp/Tools/JSIStoreValueUser.cpp"
        "${COMMON_SRC_DIR}/cpp/Tools/Mapper.cpp"
        "${COMMON_SRC_DIR}/cpp/Tools/RuntimeDecorator.cpp"
        "${COMMON_SRC_DIR}/cpp/Tools/Scheduler.cpp"
        "${COMMON_SRC_DIR}/cpp/Tools/WorkletEventHandler.cpp"
        "${COMMON_SRC_DIR}/cpp/Tools/FeaturesConfig.cpp"
        "${COMMON_SRC_DIR}/cpp/LayoutAnimations/LayoutAnimationsProxy.cpp"
        "${COMMON_SRC_DIR}/cpp/AnimatedSensor/AnimatedSensorModule.cpp"
)

# includes

file (GLOB LIBFBJNI_INCLUDE_DIR ${FBJNI_HEADERS_DIR})

target_include_directories(
        ${PACKAGE_NAME}
        PRIVATE
        "${LIBFBJNI_INCLUDE_DIR}"
        "${BUILD_DIR}/third-party-ndk/boost/boost_${BOOST_VERSION}"
        "${BUILD_DIR}/third-party-ndk/double-conversion"
        "${BUILD_DIR}/third-party-ndk/folly"
        "${BUILD_DIR}/third-party-ndk/glog/exported"
        "${NODE_MODULES_DIR}/react-native/React"
        "${NODE_MODULES_DIR}/react-native/React/Base"
        "${NODE_MODULES_DIR}/react-native/ReactAndroid/src/main/jni"
        "${NODE_MODULES_DIR}/react-native/ReactAndroid/src/main/java/com/facebook/react/turbomodule/core/jni"
        "${NODE_MODULES_DIR}/react-native/ReactCommon"
        "${NODE_MODULES_DIR}/react-native/ReactCommon/callinvoker"
        "${NODE_MODULES_DIR}/react-native/ReactCommon/jsi"
        "${NODE_MODULES_DIR}/react-native/ReactCommon/turbomodule/core"
        "${NODE_MODULES_DIR}/react-native/ReactCommon/turbomodule"
        "${NODE_MODULES_DIR}/hermes-engine/android/include/"
        "${COMMON_SRC_DIR}/cpp/headers/Tools"
        "${COMMON_SRC_DIR}/cpp/headers/SpecTools"
        "${COMMON_SRC_DIR}/cpp/headers/NativeModules"
        "${COMMON_SRC_DIR}/cpp/headers/SharedItems"
        "${COMMON_SRC_DIR}/cpp/headers/Registries"
        "${COMMON_SRC_DIR}/cpp/headers/LayoutAnimations"
        "${COMMON_SRC_DIR}/cpp/headers/AnimatedSensor"
        "${COMMON_SRC_DIR}/cpp/hidden_headers"
        "${SRC_DIR}/main/cpp/headers"
)

# find libraries

file (GLOB LIBRN_DIR "${RN_SO_DIR}/${ANDROID_ABI}")
file (GLOB HERMES_DIR "${BUILD_DIR}/third-party-ndk/hermes/jni/${ANDROID_ABI}")

find_library(
        LOG_LIB
        log
)
find_library(
        HERMES_LIB
        hermes
        PATHS ${HERMES_DIR}
        NO_CMAKE_FIND_ROOT_PATH
)
find_library(
        JSEXECUTOR_LIB
        jscexecutor
        PATHS ${LIBRN_DIR}
        NO_CMAKE_FIND_ROOT_PATH
)
find_library(
        FOLLY_JSON_LIB
        folly_json
        PATHS ${LIBRN_DIR}
        NO_CMAKE_FIND_ROOT_PATH
)
find_library(
        REACT_NATIVE_JNI_LIB
        reactnativejni
        PATHS ${LIBRN_DIR}
        NO_CMAKE_FIND_ROOT_PATH
)

find_library(
        GLOG_LIB
        glog
        PATHS ${LIBRN_DIR}
        NO_CMAKE_FIND_ROOT_PATH
)

find_library(
        FBJNI_LIB
        fbjni
        PATHS ${LIBRN_DIR}
        NO_CMAKE_FIND_ROOT_PATH
)

if(${REACT_NATIVE_TARGET_VERSION} LESS 66)
        set (JSI_LIB "")
else()
        find_library(
                JSI_LIB
                jsi
                PATHS ${LIBRN_DIR}
                NO_CMAKE_FIND_ROOT_PATH
        )
endif()

# build shared lib

set_target_properties(${PACKAGE_NAME} PROPERTIES LINKER_LANGUAGE CXX)

if(${FOR_HERMES})
    target_link_libraries(
            ${PACKAGE_NAME}
            ${LOG_LIB}
            ${JSI_LIB}
            ${HERMES_LIB}
            ${GLOG_LIB}
            ${FBJNI_LIB}
            ${FOLLY_JSON_LIB}
            ${REACT_NATIVE_JNI_LIB}
            android
    )
else()
    target_link_libraries(
            ${PACKAGE_NAME}
            ${LOG_LIB}
            ${JSI_LIB}
            ${JSEXECUTOR_LIB}
            ${GLOG_LIB}
            ${FBJNI_LIB}
            ${FOLLY_JSON_LIB}
            ${REACT_NATIVE_JNI_LIB}
            android
    )
endif()

if(${REACT_NATIVE_TARGET_VERSION} LESS 64)
    add_library(
            turbomodulejsijni
            # Sets the library as a shared library.
            SHARED
            # Provides a relative path to your source file(s).
            ./empty.cpp
    )
endif()
