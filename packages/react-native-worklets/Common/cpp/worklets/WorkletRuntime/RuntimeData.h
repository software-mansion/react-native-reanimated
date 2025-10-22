#pragma once

#include <jsi/jsi.h>
#include <string>

namespace worklets {
namespace RuntimeData {

/**
 * Unused, but kept for possible future use.
 */
constexpr uint64_t rnRuntimeId{0};
constexpr uint64_t uiRuntimeId{1};
extern const std::string uiRuntimeName;

constexpr facebook::jsi::UUID weakRuntimeUUID{2, 1, 3, 7, 2137};

}; // namespace RuntimeData
} // namespace worklets
