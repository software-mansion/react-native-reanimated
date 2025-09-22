#include <reanimated/CSS/easing/EasingFunctions.h>

#include <vector>

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

EasingFunction createEasingFunction(
    jsi::Runtime &rt,
    const jsi::Value &easingConfig) {
  if (easingConfig.isString()) {
    return getPredefinedEasingFunction(easingConfig.asString(rt).utf8(rt));
  } else if (easingConfig.isObject()) {
    return createParametrizedEasingFunction(rt, easingConfig.asObject(rt));
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
    jsi::Runtime &rt,
    const jsi::Object &easingConfig) {
  const auto easingName =
      easingConfig.getProperty(rt, "name").asString(rt).utf8(rt);

  if (easingName == "cubicBezier") {
    return cubicBezier(rt, easingConfig);
  }

  std::vector<double> pointsX;
  std::vector<double> pointsY;

  const auto points =
      easingConfig.getProperty(rt, "points").asObject(rt).asArray(rt);
  const auto pointsCount = points.size(rt);

  for (size_t i = 0; i < pointsCount; i++) {
    const auto pointObj = points.getValueAtIndex(rt, i).asObject(rt);
    pointsX.push_back(pointObj.getProperty(rt, "x").asNumber());
    pointsY.push_back(pointObj.getProperty(rt, "y").asNumber());
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
