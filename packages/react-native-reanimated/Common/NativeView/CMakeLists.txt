cmake_minimum_required(VERSION 3.13)
set(CMAKE_VERBOSE_MAKEFILE on)

set(ANDROID_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../../android)
set(CODEGEN_JNI_DIR ${ANDROID_DIR}/build/generated/source/codegen/jni)
set(CODEGEN_COMPONENTS_DIR ${CODEGEN_JNI_DIR}/react/renderer/components/rnreanimated)
file(
  GLOB CODEGEN_ORIGINAL_SRCS CONFIGURE_DEPENDS
  ${CODEGEN_JNI_DIR}/*.cpp
  ${CODEGEN_COMPONENTS_DIR}/*.cpp
)

set(CODEGEN_OVERWRITTEN_JNI_DIR .)
set(CODEGEN_OVERWRITTEN_COMPONENTS_DIR ${CODEGEN_OVERWRITTEN_JNI_DIR}/react/renderer/components/rnreanimated)
file(
  GLOB CODEGEN_OVERWRITTEN_SRCS CONFIGURE_DEPENDS 
  ${CODEGEN_OVERWRITTEN_JNI_DIR}/*.cpp
  ${CODEGEN_OVERWRITTEN_COMPONENTS_DIR}/*.cpp
)

find_package(fbjni REQUIRED CONFIG)
find_package(ReactAndroid REQUIRED CONFIG)
find_package(react-native-worklets REQUIRED CONFIG)
find_package(react-native-reanimated REQUIRED CONFIG)

add_library(
  react_codegen_rnreanimated
  OBJECT
  ${CODEGEN_OVERWRITTEN_SRCS}
  ${CODEGEN_ORIGINAL_SRCS}
)

target_include_directories(
  react_codegen_rnreanimated
  PUBLIC
  ${CODEGEN_OVERWRITTEN_JNI_DIR}
  ${CODEGEN_OVERWRITTEN_COMPONENTS_DIR}
  ${CODEGEN_JNI_DIR}
  ${CODEGEN_COMPONENTS_DIR}
  ${REACT_COMMON_DIR}
)

target_link_libraries(react_codegen_rnreanimated log ReactAndroid::jsi fbjni jsi)

target_link_libraries(react_codegen_rnreanimated react-native-reanimated::reanimated)
target_link_libraries(react_codegen_rnreanimated react-native-worklets::worklets)

  target_link_libraries(react_codegen_rnreanimated ReactAndroid::reactnative)

target_compile_options(
  react_codegen_rnreanimated
  PRIVATE
  -DLOG_TAG=\"ReactNative\"
  -fexceptions
  -frtti
  -std=c++20
  -Wall
)
