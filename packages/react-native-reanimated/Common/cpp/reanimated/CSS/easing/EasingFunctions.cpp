#include <reanimated/CSS/easing/EasingFunctions.h>

namespace reanimated::css {

inline const std::unordered_map<std::string, EasingFunction>
    PREDEFINED_EASING_MAP = {
        {"linear", [](double x) { return x; }},
        {"ease", cubicBezier(0.25, 0.1, 0.25, 0.1)},
        {"ease-in", cubicBezier(0.42, 0.0, 1.0, 1.0)},
        {"ease-out", cubicBezier(0.0, 0.0, 0.58, 1.0)},
        {"ease-in-out", cubicBezier(0.42, 0.0, 0.58, 1.0)},
        {"step-start", steps(std::vector<double>{0}, std::vector<double>{1})},
        {"step-end",
         steps(std::vector<double>{0, 1}, std::vector<double>{0, 1})}};

EasingFunction createEasingFunction(const folly::dynamic &easingConfig) {
  if (easingConfig.isString()) {
    return getPredefinedEasingFunction(easingConfig.asString());
  } else if (easingConfig.isObject()) {
    return createParametrizedEasingFunction(easingConfig);
  } else {
    throw std::runtime_error(
        std::string("[Reanimated] Invalid easing function"));
  }
}

EasingFunction getPredefinedEasingFunction(const std::string &name) {
  auto it = PREDEFINED_EASING_MAP.find(name);
  if (it != PREDEFINED_EASING_MAP.end()) {
    return it->second;
  } else {
    throw std::runtime_error(std::string(
        "[Reanimated] Easing function with name '" + name +
        "' is not defined."));
  }
}

EasingFunction createParametrizedEasingFunction(
    const folly::dynamic &easingConfig) {
  const auto easingName = easingConfig["name"].asString();

  if (easingName == "cubicBezier") {
    return cubicBezier(easingConfig);
  }

  std::vector<double> pointsX;
  std::vector<double> pointsY;

  for (const auto &point : easingConfig["points"]) {
    pointsX.push_back(point["x"].asDouble());
    pointsY.push_back(point["y"].asDouble());
  }

  if (easingName == "linear") {
    return linear(pointsX, pointsY);
  } else if (easingName == "steps") {
    return steps(pointsX, pointsY);
  } else {
    throw std::runtime_error(std::string(
        "[Reanimated] Parametrized easing function with name '" + easingName +
        "' is not defined."));
  }
}

} // namespace reanimated::css
