cmake_minimum_required(VERSION 3.8)

file(GLOB_RECURSE REANIMATED_COMMON_CPP_SOURCES CONFIGURE_DEPENDS "${COMMON_CPP_DIR}/reanimated/*.cpp")
file(GLOB_RECURSE REANIMATED_ANDROID_CPP_SOURCES CONFIGURE_DEPENDS "${ANDROID_CPP_DIR}/reanimated/*.cpp")

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
    "${COMMON_CPP_DIR}"
    "${ANDROID_CPP_DIR}"
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

if(ReactAndroid_VERSION_MINOR GREATER_EQUAL 76)
    target_link_libraries(
        reanimated
        ReactAndroid::reactnative
    )
else()
    target_link_libraries(
        reanimated
        ReactAndroid::react_nativemodule_core
    )
endif()
