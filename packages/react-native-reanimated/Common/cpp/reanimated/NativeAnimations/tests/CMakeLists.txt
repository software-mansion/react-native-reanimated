cmake_minimum_required(VERSION 3.16)
project(ReanimatedNativeAnimationTests LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

get_filename_component(REANIMATED_PACKAGE_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../../../../.." ABSOLUTE)
set(REACT_NATIVE_ROOT "${REANIMATED_PACKAGE_ROOT}/../../node_modules/react-native")

add_executable(
  native_animation_service_test
  NativeAnimationServiceTest.cc
  ../../LayoutAnimations/LayoutNativeAnimationAdapter.cpp
  ../NativeAnimationConflictPolicy.cpp
  ../NativeAnimationCoordinator.cpp
  ../NativeAnimationDispatcher.cpp
  ../NativeAnimationIdentity.cpp
  ../NativeAnimationTargetRegistry.cpp
  ../NativeAnimationTiming.cpp
  ../NativeAnimationTrace.cpp
  ../NativeAnimationValidation.cpp
  ../NativeAnimationValue.cpp)

target_include_directories(
  native_animation_service_test
  PRIVATE "${REANIMATED_PACKAGE_ROOT}/Common/cpp" "${REACT_NATIVE_ROOT}/ReactCommon")

# In debug builds react_native_assert needs glog, which this standalone build
# does not have. This flag turns it into a no-op; the suite's own assert()
# calls stay active because NDEBUG stays undefined.
target_compile_definitions(native_animation_service_test PRIVATE REACT_NATIVE_PRODUCTION)
