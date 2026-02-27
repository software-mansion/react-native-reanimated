#pragma once

#include <jsi/jsi.h>

#include <string>

namespace worklets {
namespace RuntimeData {

using RuntimeId = uint64_t;

/**
 * Unused, but kept for possible future use.
 */
constexpr RuntimeId rnRuntimeId{1};
constexpr RuntimeId uiRuntimeId{2};
extern const std::string uiRuntimeName;

#if REACT_NATIVE_MINOR_VERSION >= 81

constexpr facebook::jsi::UUID weakRuntimeUUID{0x770c6f2e, 0x1e4d, 0x436a, 0xa2b1, 0x9f322c8d5f5e};

#endif // REACT_NATIVE_MINOR_VERSION >= 81

}; // namespace RuntimeData
} // namespace worklets
