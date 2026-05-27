#pragma once

#include <jsi/jsi.h>

#include <cstdint>

namespace worklets {
namespace RuntimeData {

/**
 * Represents the different types of runtime environments available for
 * worklets.
 */
enum class RuntimeKind : std::uint8_t {
  ReactNative = 1,
  UI = 2,
  Worker = 3,
};

constexpr auto runtimeKindBindingName = "__RUNTIME_KIND";

using RuntimeId = uint64_t;

/**
 * Unused, but kept for possible future use.
 */
constexpr RuntimeId rnRuntimeId{static_cast<RuntimeId>(RuntimeKind::ReactNative)};
constexpr RuntimeId uiRuntimeId{static_cast<RuntimeId>(RuntimeKind::UI)};

constexpr facebook::jsi::UUID weakRuntimeUUID{0x770c6f2e, 0x1e4d, 0x436a, 0xa2b1, 0x9f322c8d5f5e};

constexpr const char *rnRuntimeName = "RN";
constexpr const char *uiRuntimeName = "UI";
constexpr const char *runtimeNameBindingName = "__RUNTIME_NAME";

}; // namespace RuntimeData

} // namespace worklets
