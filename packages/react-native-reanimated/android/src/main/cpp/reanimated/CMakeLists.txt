cmake_minimum_required(VERSION 3.8)

file(GLOB_RECURSE REANIMATED_COMMON_CPP_SOURCES CONFIGURE_DEPENDS "${REANIMATED_COMMON_CPP_DIR}/*.cpp")
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
    "${REANIMATED_COMMON_CPP_DIR}/AnimatedSensor"
    "${REANIMATED_COMMON_CPP_DIR}/Fabric"
    "${REANIMATED_COMMON_CPP_DIR}/LayoutAnimations"
    "${REANIMATED_COMMON_CPP_DIR}/NativeModules"
    "${REANIMATED_COMMON_CPP_DIR}/RuntimeDecorators"
    "${REANIMATED_COMMON_CPP_DIR}/Registries"
    "${REANIMATED_COMMON_CPP_DIR}/Tools"
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
    "${REACT_NATIVE_DIR}/ReactCommon/react/nativemodule/core/ReactCommon"
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
