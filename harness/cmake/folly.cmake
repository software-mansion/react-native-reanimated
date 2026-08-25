# Mirrors third-party-podspecs/RCT-Folly.podspec: same folly release, same
# source subset (Default + Fabric subspecs), same generated folly-config.h.

FetchContent_Declare(
  folly
  URL https://github.com/facebook/folly/archive/refs/tags/v2024.11.18.00.tar.gz
  URL_HASH
    SHA256=b2c6879ba8ba625218d1ab9eefcc1611a9003d05bc2cb1a38f3bae21892e5167
  DOWNLOAD_EXTRACT_TIMESTAMP TRUE)
FetchContent_Populate(folly)

configure_file(${CMAKE_CURRENT_LIST_DIR}/folly-config.h
               ${folly_SOURCE_DIR}/folly/folly-config.h COPYONLY)

execute_process(
  COMMAND brew --prefix
  OUTPUT_VARIABLE HOMEBREW_PREFIX
  OUTPUT_STRIP_TRAILING_WHITESPACE COMMAND_ERROR_IS_FATAL ANY)
list(APPEND CMAKE_PREFIX_PATH ${HOMEBREW_PREFIX})

find_package(glog CONFIG REQUIRED)
find_package(fmt CONFIG REQUIRED)
find_package(double-conversion CONFIG REQUIRED)

add_library(
  folly_runtime STATIC
  ${folly_SOURCE_DIR}/folly/Conv.cpp
  ${folly_SOURCE_DIR}/folly/Demangle.cpp
  ${folly_SOURCE_DIR}/folly/FileUtil.cpp
  ${folly_SOURCE_DIR}/folly/Format.cpp
  ${folly_SOURCE_DIR}/folly/ScopeGuard.cpp
  ${folly_SOURCE_DIR}/folly/SharedMutex.cpp
  ${folly_SOURCE_DIR}/folly/String.cpp
  ${folly_SOURCE_DIR}/folly/Unicode.cpp
  ${folly_SOURCE_DIR}/folly/concurrency/CacheLocality.cpp
  ${folly_SOURCE_DIR}/folly/container/detail/F14Table.cpp
  ${folly_SOURCE_DIR}/folly/detail/FileUtilDetail.cpp
  ${folly_SOURCE_DIR}/folly/detail/Futex.cpp
  ${folly_SOURCE_DIR}/folly/detail/SplitStringSimd.cpp
  ${folly_SOURCE_DIR}/folly/detail/StaticSingletonManager.cpp
  ${folly_SOURCE_DIR}/folly/detail/UniqueInstance.cpp
  ${folly_SOURCE_DIR}/folly/hash/SpookyHashV2.cpp
  ${folly_SOURCE_DIR}/folly/json/dynamic.cpp
  ${folly_SOURCE_DIR}/folly/json/json.cpp
  ${folly_SOURCE_DIR}/folly/json/json_pointer.cpp
  ${folly_SOURCE_DIR}/folly/lang/CString.cpp
  ${folly_SOURCE_DIR}/folly/lang/Exception.cpp
  ${folly_SOURCE_DIR}/folly/lang/SafeAssert.cpp
  ${folly_SOURCE_DIR}/folly/lang/ToAscii.cpp
  ${folly_SOURCE_DIR}/folly/memory/ReentrantAllocator.cpp
  ${folly_SOURCE_DIR}/folly/memory/SanitizeLeak.cpp
  ${folly_SOURCE_DIR}/folly/memory/detail/MallocImpl.cpp
  ${folly_SOURCE_DIR}/folly/net/NetOps.cpp
  ${folly_SOURCE_DIR}/folly/portability/SysUio.cpp
  ${folly_SOURCE_DIR}/folly/synchronization/ParkingLot.cpp
  ${folly_SOURCE_DIR}/folly/synchronization/SanitizeThread.cpp
  ${folly_SOURCE_DIR}/folly/system/AtFork.cpp
  ${folly_SOURCE_DIR}/folly/system/ThreadId.cpp)

# boost and fast_float are header-only and ship no CMake config.
target_include_directories(
  folly_runtime SYSTEM PUBLIC ${folly_SOURCE_DIR} ${HOMEBREW_PREFIX}/include)
target_link_libraries(folly_runtime PUBLIC glog::glog fmt::fmt
                                           double-conversion::double-conversion)
target_compile_options(folly_runtime PUBLIC -faligned-new)
