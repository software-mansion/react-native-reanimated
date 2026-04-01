#pragma once

#include <reanimated/CSS/common/definitions.h>

#include <jsi/jsi.h>
#include <string>
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

EasingFunction toEasingFunction(const EasingConfig &config);

EasingConfig getEasingConfig(jsi::Runtime &rt, const jsi::Value &easingValue);

} // namespace reanimated::css
