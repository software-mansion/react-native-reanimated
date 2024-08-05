cmake_minimum_required(VERSION 3.8)

file(GLOB_RECURSE REANIMATED_COMMON_SOURCES CONFIGURE_DEPENDS "${REANIMATED_COMMON_DIR}/*.cpp")
file(GLOB_RECURSE SOURCES_ANDROID CONFIGURE_DEPENDS "${ANDROID_SRC_DIR}/main/cpp/*.cpp")

add_library(
    reanimated
    SHARED
    ${REANIMATED_COMMON_SOURCES}
    ${SOURCES_ANDROID}
)

target_include_directories(
    reanimated
    PRIVATE
    "${REANIMATED_COMMON_DIR}/AnimatedSensor"
    "${REANIMATED_COMMON_DIR}/Fabric"
    "${REANIMATED_COMMON_DIR}/LayoutAnimations"
    "${REANIMATED_COMMON_DIR}/NativeModules"
    "${REANIMATED_COMMON_DIR}/Tools"
)

target_include_directories(
    reanimated
    PRIVATE
    "${ANDROID_SRC_DIR}/main/cpp"
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
)
