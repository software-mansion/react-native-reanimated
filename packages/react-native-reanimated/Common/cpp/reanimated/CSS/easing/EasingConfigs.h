#pragma once

#include <reanimated/CSS/easing/EasingFunctions.h>

#include <jsi/jsi.h>
#include <string>
#include <unordered_map>
#include <variant>
#include <vector>

namespace reanimated::css {

struct LinearEasing {};

struct CubicBezierEasing {
  double x1, y1, x2, y2;
};

struct StepsEasing {
  std::vector<double> pointsX;
  std::vector<double> pointsY;
};

struct LinearStopsEasing {
  std::vector<double> pointsX;
  std::vector<double> pointsY;
};

using EasingConfig = std::variant<LinearEasing, CubicBezierEasing, StepsEasing, LinearStopsEasing>;

using KeyframeEasingConfigs = std::unordered_map<double, EasingConfig>;

EasingConfig getEasingConfig(jsi::Runtime &rt, const jsi::Value &easingConfig);
EasingFunction getEasingFunctionFromConfig(const EasingConfig &easingConfig);

} // namespace reanimated::css
