#pragma once

#include <reanimated/CSS/configs/common.h>

#include <jsi/jsi.h>

#include <array>
#include <memory>
#include <optional>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <variant>
#include <vector>

namespace reanimated::css::apple {

using CAColorRGBA = std::array<double, 4>;
using CAShadowOffset = std::array<double, 2>;

// TODO: Add transform support.
using CAKeyframeValue = std::variant<double, CAColorRGBA, CAShadowOffset>;

struct CAKeyframe {
  double offset{};
  std::optional<CAKeyframeValue> value;
};

using CAKeyframesMap = std::unordered_map<std::string, std::vector<CAKeyframe>>;

struct PropertyRouting {
  std::shared_ptr<CAKeyframesMap> platformProperties;
  std::unordered_set<std::string> loopProperties;
};

std::shared_ptr<CAKeyframesMap> parseSupportedProperties(jsi::Runtime &rt, const jsi::Object &config);

PropertyRouting routeProperties(
    const std::unordered_set<std::string> &allProperties,
    const std::shared_ptr<const CAKeyframesMap> &platformSupportedProperties,
    const EasingConfig &globalEasing,
    const std::shared_ptr<KeyframeEasingConfigs> &keyframeEasingConfigs);

} // namespace reanimated::css::apple
