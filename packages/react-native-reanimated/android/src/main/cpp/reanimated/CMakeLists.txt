cmake_minimum_required(VERSION 3.8)

file(GLOB_RECURSE REANIMATED_COMMON_CPP_SOURCES CONFIGURE_DEPENDS "${REANIMATED_COMMON_CPP_DIR}/reanimated/*.cpp")
file(GLOB_RECURSE REANIMATED_ANDROID_CPP_SOURCES CONFIGURE_DEPENDS "${REANIMATED_ANDROID_CPP_DIR}/*.cpp")

find_package(ReactAndroid REQUIRED CONFIG)

add_library(
    reanimated
    SHARED
    ${REANIMATED_COMMON_CPP_SOURCES}
    ${REANIMATED_ANDROID_CPP_SOURCES}
)

target_include_directories(
    reanimated
    PRIVATE
    "${REANIMATED_COMMON_CPP_DIR}/reanimated/AnimatedSensor"
    "${REANIMATED_COMMON_CPP_DIR}"
    "${REANIMATED_COMMON_CPP_DIR}/reanimated/Fabric"
    "${REANIMATED_COMMON_CPP_DIR}/reanimated/LayoutAnimations"
    "${REANIMATED_COMMON_CPP_DIR}/reanimated/NativeModules"
    "${REANIMATED_COMMON_CPP_DIR}/reanimated/Tools"
    "${REANIMATED_COMMON_CPP_DIR}/reanimated/RuntimeDecorators"
)

target_include_directories(
    reanimated
    PRIVATE
    "${REANIMATED_ANDROID_CPP_DIR}"
)

target_include_directories(
    reanimated
    PRIVATE
    "${REACT_NATIVE_DIR}/ReactCommon"
    "${REACT_NATIVE_DIR}/ReactAndroid/src/main/jni/react/turbomodule"
    "${REACT_NATIVE_DIR}/ReactCommon/callinvoker"
    "${REACT_NATIVE_DIR}/ReactCommon/runtimeexecutor"
)

if(${IS_NEW_ARCHITECTURE_ENABLED})
    target_include_directories(
        reanimated
        PRIVATE
        "${REACT_NATIVE_DIR}/ReactCommon/yoga"
        "${REACT_NATIVE_DIR}/ReactCommon/react/renderer/graphics/platform/cxx"
    )
endif()

set_target_properties(
    reanimated
    PROPERTIES
    LINKER_LANGUAGE
    CXX
)

target_link_libraries(
    reanimated
    worklets
    ReactAndroid::react_nativemodule_core
)
