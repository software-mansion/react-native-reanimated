#include <reanimated/CSS/easing/EasingConfigs.h>
#include <reanimated/CSS/easing/cubicBezier.h>
#include <reanimated/CSS/easing/linear.h>
#include <reanimated/CSS/easing/steps.h>

#include <stdexcept>
#include <type_traits>
#include <unordered_map>
#include <utility>

namespace reanimated::css {

EasingFunction getEasingFunctionFromConfig(const EasingConfig &easingConfig) {
  return std::visit(
      [](const auto &config) -> EasingFunction {
        using T = std::decay_t<decltype(config)>;
        if constexpr (std::is_same_v<T, LinearEasing>) {
          return [](double x) {
            return x;
          };
        } else if constexpr (std::is_same_v<T, CubicBezierEasing>) {
          return cubicBezier(config.x1, config.y1, config.x2, config.y2);
        } else if constexpr (std::is_same_v<T, StepsEasing>) {
          return steps(config.pointsX, config.pointsY);
        } else {
          return linear(config.pointsX, config.pointsY);
        }
      },
      easingConfig);
}

EasingConfig getEasingConfig(jsi::Runtime &rt, const jsi::Value &easingConfig) {
  static const std::unordered_map<std::string, EasingConfig> PREDEFINED_EASING_CONFIGS = {
      {"linear", LinearEasing{}},
      {"ease", CubicBezierEasing{0.25, 0.1, 0.25, 1.0}},
      {"ease-in", CubicBezierEasing{0.42, 0.0, 1.0, 1.0}},
      {"ease-out", CubicBezierEasing{0.0, 0.0, 0.58, 1.0}},
      {"ease-in-out", CubicBezierEasing{0.42, 0.0, 0.58, 1.0}},
      {"step-start", StepsEasing{{0}, {1}}},
      {"step-end", StepsEasing{{0, 1}, {0, 1}}}};

  if (easingConfig.isString()) {
    const auto easingName = easingConfig.asString(rt).utf8(rt);
    const auto easingIt = PREDEFINED_EASING_CONFIGS.find(easingName);
    if (easingIt != PREDEFINED_EASING_CONFIGS.end()) {
      return easingIt->second;
    }
    throw std::runtime_error("[Reanimated] Easing function with name '" + easingName + "' is not defined.");
  }

  if (easingConfig.isObject()) {
    const auto easingObj = easingConfig.asObject(rt);
    const auto easingName = easingObj.getProperty(rt, "name").asString(rt).utf8(rt);
    if (easingName == "cubicBezier") {
      return CubicBezierEasing{
          easingObj.getProperty(rt, "x1").asNumber(),
          easingObj.getProperty(rt, "y1").asNumber(),
          easingObj.getProperty(rt, "x2").asNumber(),
          easingObj.getProperty(rt, "y2").asNumber()};
    }

    std::vector<double> pointsX;
    std::vector<double> pointsY;

    const auto points = easingObj.getProperty(rt, "points").asObject(rt).asArray(rt);
    const auto pointsCount = points.size(rt);
    pointsX.reserve(pointsCount);
    pointsY.reserve(pointsCount);

    for (size_t i = 0; i < pointsCount; i++) {
      const auto pointObj = points.getValueAtIndex(rt, i).asObject(rt);
      pointsX.emplace_back(pointObj.getProperty(rt, "x").asNumber());
      pointsY.emplace_back(pointObj.getProperty(rt, "y").asNumber());
    }

    if (easingName == "linear") {
      return LinearStopsEasing{std::move(pointsX), std::move(pointsY)};
    }
    if (easingName == "steps") {
      return StepsEasing{std::move(pointsX), std::move(pointsY)};
    }
    throw std::runtime_error(
        "[Reanimated] Parametrized easing function with name '" + easingName + "' is not defined.");
  }

  throw std::runtime_error("[Reanimated] Invalid easing function");
}

} // namespace reanimated::css
