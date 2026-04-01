#include <reanimated/CSS/easing/EasingConfig.h>

#include <reanimated/CSS/easing/cubicBezier.h>
#include <reanimated/CSS/easing/linear.h>
#include <reanimated/CSS/easing/steps.h>

#include <string>
#include <unordered_map>

namespace reanimated::css {

// Well-known predefined easings as CubicBezierEasing configs.
// Values match the CSS specification.
static const std::unordered_map<std::string, CubicBezierEasing> PREDEFINED_BEZIER_MAP = {
    {"ease", {0.25, 0.1, 0.25, 1.0}},
    {"ease-in", {0.42, 0.0, 1.0, 1.0}},
    {"ease-out", {0.0, 0.0, 0.58, 1.0}},
    {"ease-in-out", {0.42, 0.0, 0.58, 1.0}},
};

EasingFunction toEasingFunction(const EasingConfig &config) {
  return std::visit(
      [](const auto &easing) -> EasingFunction {
        using T = std::decay_t<decltype(easing)>;

        if constexpr (std::is_same_v<T, LinearEasing>) {
          return [](double x) {
            return x;
          };
        } else if constexpr (std::is_same_v<T, CubicBezierEasing>) {
          return cubicBezier(easing.x1, easing.y1, easing.x2, easing.y2);
        } else if constexpr (std::is_same_v<T, StepsEasing>) {
          return steps(easing.pointsX, easing.pointsY);
        } else if constexpr (std::is_same_v<T, LinearStopsEasing>) {
          return linear(easing.pointsX, easing.pointsY);
        }
      },
      config);
}

EasingConfig getEasingConfig(jsi::Runtime &rt, const jsi::Value &easingValue) {
  if (easingValue.isString()) {
    const auto name = easingValue.asString(rt).utf8(rt);

    if (name == "linear") {
      return LinearEasing{};
    }
    if (name == "step-start") {
      return StepsEasing{{0}, {1}};
    }
    if (name == "step-end") {
      return StepsEasing{{0, 1}, {0, 1}};
    }

    // Predefined bezier easings (ease, ease-in, ease-out, ease-in-out)
    auto it = PREDEFINED_BEZIER_MAP.find(name);
    if (it != PREDEFINED_BEZIER_MAP.end()) {
      return it->second;
    }

    throw std::runtime_error("[Reanimated] Unknown easing function name: " + name);
  }

  if (easingValue.isObject()) {
    const auto &obj = easingValue.asObject(rt);
    const auto name = obj.getProperty(rt, "name").asString(rt).utf8(rt);

    if (name == "cubicBezier") {
      return CubicBezierEasing{
          obj.getProperty(rt, "x1").asNumber(),
          obj.getProperty(rt, "y1").asNumber(),
          obj.getProperty(rt, "x2").asNumber(),
          obj.getProperty(rt, "y2").asNumber()};
    }

    // Both steps() and linear() with stops have a "points" array
    const auto points = obj.getProperty(rt, "points").asObject(rt).asArray(rt);
    const auto pointsCount = points.size(rt);

    std::vector<double> pointsX;
    std::vector<double> pointsY;
    pointsX.reserve(pointsCount);
    pointsY.reserve(pointsCount);

    for (size_t i = 0; i < pointsCount; i++) {
      const auto pointObj = points.getValueAtIndex(rt, i).asObject(rt);
      pointsX.push_back(pointObj.getProperty(rt, "x").asNumber());
      pointsY.push_back(pointObj.getProperty(rt, "y").asNumber());
    }

    if (name == "steps") {
      return StepsEasing{std::move(pointsX), std::move(pointsY)};
    }
    if (name == "linear") {
      return LinearStopsEasing{std::move(pointsX), std::move(pointsY)};
    }

    throw std::runtime_error("[Reanimated] Unknown parametrized easing: " + name);
  }

  throw std::runtime_error("[Reanimated] Invalid easing function config");
}

} // namespace reanimated::css
