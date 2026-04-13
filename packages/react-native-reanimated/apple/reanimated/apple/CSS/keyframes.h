#pragma once

#include <jsi/jsi.h>
#include <reanimated/CSS/configs/common.h>

#include <array>
#include <memory>
#include <optional>
#include <string>
#include <unordered_map>
#include <variant>
#include <vector>

namespace reanimated::css {

using CAColorRGBA = std::array<double, 4>;
using CAShadowOffset = std::array<double, 2>;

// TODO: Add transform support.
using CAKeyframeValue = std::variant<double, CAColorRGBA, CAShadowOffset>;

struct CAKeyframe {
  double offset{};
  std::optional<CAKeyframeValue> value;
};

using CAKeyframesMap = std::unordered_map<std::string, std::vector<CAKeyframe>>;

std::shared_ptr<CAKeyframesMap> parsePlatformSupportedProperties(jsi::Runtime &rt, const jsi::Object &config);

} // namespace reanimated::css
