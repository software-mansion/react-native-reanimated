#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <vector>

namespace reanimated {

using namespace facebook;

using PropertyNames = std::vector<std::string>;
using PropertyValues = std::unique_ptr<jsi::Value>;
using PropertyPath = std::vector<std::string>;
/**
 * If nullopt - all style properties can trigger transition
 * If empty vector - no style property can trigger transition
 * Otherwise - only specified style properties can trigger transition
 */
using TransitionProperties = std::optional<PropertyNames>;

using EasingFunction = std::function<double(double)>;
using ColorChannels = std::array<uint8_t, 4>;
using Vec16Array = std::array<double, 16>;
using Matrix4x4 = std::array<std::array<double, 4>, 4>;

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
