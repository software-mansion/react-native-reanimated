# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

cmake_minimum_required(VERSION 3.13)
set(CMAKE_VERBOSE_MAKEFILE on)

set(LIB_ANDROID_DIR ${CMAKE_CURRENT_SOURCE_DIR}/../../..)
# set(LIB_CPP_DIR ${LIB_ANDROID_DIR}/../cpp)
# set(LIB_CUSTOM_SOURCES_DIR ${LIB_CPP_DIR}/react/renderer/components/${LIB_LITERAL})
set(LIB_ANDROID_GENERATED_JNI_DIR ${LIB_ANDROID_DIR}/build/generated/source/codegen/jni)
set(LIB_ANDROID_GENERATED_COMPONENTS_DIR ${LIB_ANDROID_GENERATED_JNI_DIR}/react/renderer/components/rnreanimated)

file(GLOB react_codegen_SRCS CONFIGURE_DEPENDS *.cpp react/renderer/components/rnreanimated/*.cpp)
# file(GLOB LIB_CUSTOM_SRCS CONFIGURE_DEPENDS ${LIB_CUSTOM_SOURCES_DIR}/*.cpp)
file(GLOB LIB_ANDROID_GENERATED_JNI_SRCS CONFIGURE_DEPENDS ${LIB_ANDROID_GENERATED_JNI_DIR}/*.cpp)
file(GLOB LIB_CODEGEN_SRCS CONFIGURE_DEPENDS ${LIB_ANDROID_GENERATED_COMPONENTS_DIR}/*.cpp)

message(WARNING "mleko: ${react_codegen_SRCS}")

add_library(
  react_codegen_rnreanimated
  OBJECT
  ${react_codegen_SRCS}
  ${LIB_CODEGEN_SRCS}
  ${LIB_ANDROID_GENERATED_JNI_SRCS}
)

target_include_directories(
  react_codegen_rnreanimated
  PUBLIC
  .
  react/renderer/components/rnreanimated
  ${LIB_ANDROID_GENERATED_JNI_DIR}
  ${LIB_ANDROID_GENERATED_COMPONENTS_DIR}
)

target_link_libraries(
  react_codegen_rnreanimated
  fbjni
  jsi
  # We need to link different libraries based on whether we are building rncore or not, that's necessary
  # because we want to break a circular dependency between react_codegen_rncore and reactnative
  reactnative
)

target_compile_options(
  react_codegen_rnreanimated
  PRIVATE
  -DLOG_TAG=\"ReactNative\"
  -fexceptions
  -frtti
  -std=c++20
  -Wall
)
