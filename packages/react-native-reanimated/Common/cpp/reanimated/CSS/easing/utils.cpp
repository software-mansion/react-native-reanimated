#include <reanimated/CSS/easing/utils.h>

namespace reanimated::css {

inline const std::unordered_map<std::string, std::shared_ptr<Easing>>
    PREDEFINED_EASING_MAP = {
        {"linear",
         linear(std::vector<double>{0, 1}, std::vector<double>{0, 1})},
        {"ease", cubicBezier(0.25, 0.1, 0.25, 0.1)},
        {"ease-in", cubicBezier(0.42, 0.0, 1.0, 1.0)},
        {"ease-out", cubicBezier(0.0, 0.0, 0.58, 1.0)},
        {"ease-in-out", cubicBezier(0.42, 0.0, 0.58, 1.0)},
        {"step-start", steps(std::vector<double>{0}, std::vector<double>{1})},
        {"step-end",
         steps(std::vector<double>{0, 1}, std::vector<double>{0, 1})}};

std::shared_ptr<Easing> createEasing(
    jsi::Runtime &rt,
    const jsi::Value &easingConfig) {
  if (easingConfig.isString()) {
    return getPredefinedEasing(easingConfig.asString(rt).utf8(rt));
  } else if (easingConfig.isObject()) {
    return createParametrizedEasing(rt, easingConfig.asObject(rt));
  } else {
    throw std::runtime_error(
        std::string("[Reanimated] Invalid easing function"));
  }
}

std::shared_ptr<Easing> getPredefinedEasing(const std::string &name) {
  auto it = PREDEFINED_EASING_MAP.find(name);
  if (it != PREDEFINED_EASING_MAP.end()) {
    return it->second;
  } else {
    throw std::runtime_error(std::string(
        "[Reanimated] EasingBase function with name '" + name +
        "' is not defined."));
  }
}

std::shared_ptr<Easing> createParametrizedEasing(
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
