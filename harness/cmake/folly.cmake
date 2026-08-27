set(FOLLY_SOURCE_DIR
    ""
    CACHE PATH "Path to the React Native-pinned Folly source")
if(FOLLY_SOURCE_DIR)
  set(folly_source_dir ${FOLLY_SOURCE_DIR})
else()
  FetchContent_Declare(
    folly
    URL https://github.com/facebook/folly/archive/refs/tags/v2024.11.18.00.tar.gz
    URL_HASH
      SHA256=b2c6879ba8ba625218d1ab9eefcc1611a9003d05bc2cb1a38f3bae21892e5167
    DOWNLOAD_EXTRACT_TIMESTAMP TRUE)
  FetchContent_Populate(folly)
  set(folly_source_dir ${folly_SOURCE_DIR})
endif()

option(HARNESS_USE_HOMEBREW "Discover host dependencies through Homebrew" ON)
if(APPLE AND HARNESS_USE_HOMEBREW)
  find_program(BREW_EXECUTABLE brew)
  if(BREW_EXECUTABLE)
    execute_process(
      COMMAND ${BREW_EXECUTABLE} --prefix
      OUTPUT_VARIABLE HOMEBREW_PREFIX
      OUTPUT_STRIP_TRAILING_WHITESPACE)
    list(PREPEND CMAKE_PREFIX_PATH ${HOMEBREW_PREFIX})
  endif()
endif()

find_package(glog CONFIG REQUIRED)
find_package(fmt CONFIG REQUIRED)
find_package(double-conversion CONFIG REQUIRED)
find_package(Threads REQUIRED)
find_path(BOOST_INCLUDE_DIR boost/algorithm/string.hpp REQUIRED)
find_path(FAST_FLOAT_INCLUDE_DIR fast_float/fast_float.h REQUIRED)

add_library(
  folly_runtime STATIC
  ${folly_source_dir}/folly/Conv.cpp
  ${folly_source_dir}/folly/Demangle.cpp
  ${folly_source_dir}/folly/FileUtil.cpp
  ${folly_source_dir}/folly/Format.cpp
  ${folly_source_dir}/folly/ScopeGuard.cpp
  ${folly_source_dir}/folly/SharedMutex.cpp
  ${folly_source_dir}/folly/String.cpp
  ${folly_source_dir}/folly/Unicode.cpp
  ${folly_source_dir}/folly/concurrency/CacheLocality.cpp
  ${folly_source_dir}/folly/container/detail/F14Table.cpp
  ${folly_source_dir}/folly/detail/FileUtilDetail.cpp
  ${folly_source_dir}/folly/detail/Futex.cpp
  ${folly_source_dir}/folly/detail/SplitStringSimd.cpp
  ${folly_source_dir}/folly/detail/StaticSingletonManager.cpp
  ${folly_source_dir}/folly/detail/UniqueInstance.cpp
  ${folly_source_dir}/folly/hash/SpookyHashV2.cpp
  ${folly_source_dir}/folly/json/dynamic.cpp
  ${folly_source_dir}/folly/json/json.cpp
  ${folly_source_dir}/folly/json/json_pointer.cpp
  ${folly_source_dir}/folly/lang/CString.cpp
  ${folly_source_dir}/folly/lang/Exception.cpp
  ${folly_source_dir}/folly/lang/SafeAssert.cpp
  ${folly_source_dir}/folly/lang/ToAscii.cpp
  ${folly_source_dir}/folly/memory/ReentrantAllocator.cpp
  ${folly_source_dir}/folly/memory/SanitizeLeak.cpp
  ${folly_source_dir}/folly/memory/detail/MallocImpl.cpp
  ${folly_source_dir}/folly/net/NetOps.cpp
  ${folly_source_dir}/folly/portability/SysUio.cpp
  ${folly_source_dir}/folly/synchronization/ParkingLot.cpp
  ${folly_source_dir}/folly/synchronization/SanitizeThread.cpp
  ${folly_source_dir}/folly/system/AtFork.cpp
  ${folly_source_dir}/folly/system/ThreadId.cpp)

# boost and fast_float are header-only and ship no CMake config.
target_include_directories(
  folly_runtime SYSTEM PUBLIC ${folly_source_dir} ${BOOST_INCLUDE_DIR}
                              ${FAST_FLOAT_INCLUDE_DIR})
target_link_libraries(folly_runtime PUBLIC glog::glog fmt::fmt
                                           double-conversion::double-conversion
                                           Threads::Threads ${CMAKE_DL_LIBS})
target_compile_definitions(
  folly_runtime
  PUBLIC FOLLY_NO_CONFIG=1 FOLLY_MOBILE=1 FOLLY_CFG_NO_COROUTINES=1
         FOLLY_HAVE_CLOCK_GETTIME=1 FOLLY_HAVE_PTHREAD=1)
if(APPLE)
  target_compile_definitions(folly_runtime PUBLIC FOLLY_USE_LIBCPP=1)
else()
  target_compile_definitions(
    folly_runtime PUBLIC FOLLY_HAVE_RECVMMSG=1 FOLLY_HAVE_XSI_STRERROR_R=1)
endif()
target_compile_options(folly_runtime PUBLIC -faligned-new)
