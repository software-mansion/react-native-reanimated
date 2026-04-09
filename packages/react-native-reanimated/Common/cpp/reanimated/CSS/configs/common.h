#pragma once

#include <jsi/jsi.h>
#include <reanimated/CSS/easing/EasingFunctions.h>

#include <string>
#include <utility>
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

double getDuration(jsi::Runtime &rt, const jsi::Object &config);

EasingFunction getTimingFunction(jsi::Runtime &rt, const jsi::Object &config);
EasingConfig getEasingConfig(jsi::Runtime &rt, const jsi::Value &easingConfig);
EasingConfig getEasingConfig(jsi::Runtime &rt, const jsi::Object &config);
EasingFunction getEasingFunctionFromConfig(const EasingConfig &easingConfig);

double getDelay(jsi::Runtime &rt, const jsi::Object &config);

std::pair<std::string, std::string> splitCompoundComponentName(const std::string &compoundComponentName);

} // namespace reanimated::css
