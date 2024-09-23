#include <reanimated/CSS/easing/EasingFunctions.h>

namespace reanimated {

inline const std::unordered_map<std::string, EasingFunction>
    predefinedEasingMap = {
        {"linear", [](double x) { return x; }},
        {"ease", createBezierFunction(0.25, 0.1, 0.25, 0.1)},
        {"easeIn", createBezierFunction(0.42, 0.0, 1.0, 1.0)},
        {"easeOut", createBezierFunction(0.0, 0.0, 0.58, 1.0)},
        {"easeInOut", createBezierFunction(0.42, 0.0, 0.58, 1.0)},
        {"stepStart",
         createStepsEasingFunction(
             std::vector<double>{0},
             std::vector<double>{1})},
        {"stepEnd",
         createStepsEasingFunction(
             std::vector<double>{0, 1},
             std::vector<double>{0, 1})}};

EasingFunction getEasingFunction(
    const jsi::Value &easingConfig,
    jsi::Runtime &rt) {
  if (easingConfig.isString()) {
    return getPredefinedEasingFunction(easingConfig.asString(rt).utf8(rt));
  } else if (easingConfig.isObject()) {
    return getParametrizedEasingFunction(easingConfig, rt);
  } else {
    throw std::runtime_error(
        std::string("[Reanimated] Invalid easing function"));
  }
}

EasingFunction getPredefinedEasingFunction(const std::string &name) {
  auto it = predefinedEasingMap.find(name);
  if (it != predefinedEasingMap.end()) {
    return it->second;
  } else {
    throw std::runtime_error(std::string(
        "[Reanimated] Easing function with name '" + name +
        "' is not defined."));
  }
}

EasingFunction getParametrizedEasingFunction(
    const jsi::Value &easingConfig,
    jsi::Runtime &rt) {
  jsi::Object obj = easingConfig.asObject(rt);
  std::string easingName = obj.getProperty(rt, "name").asString(rt).utf8(rt);
  if (easingName == "cubicBezier") {
    double x1 = obj.getProperty(rt, "x1").asNumber();
    double y1 = obj.getProperty(rt, "y1").asNumber();
    double x2 = obj.getProperty(rt, "x2").asNumber();
    double y2 = obj.getProperty(rt, "y2").asNumber();
    return createBezierFunction(x1, y1, x2, y2);
  } else if (easingName == "linearParametrized" || easingName == "steps") {
    auto getPointsArray = [&](std::string easing, std::string coord) {
      std::string propName = (easing == "steps" ? "steps" : "points") + coord;
      return obj.getProperty(rt, propName.c_str()).asObject(rt).asArray(rt);
    };

    jsi::Array pointsX = getPointsArray(easingName, "X");
    jsi::Array pointsY = getPointsArray(easingName, "Y");

    size_t length = pointsX.size(rt);
    std::vector<double> arrX, arrY;
    arrX.reserve(length);
    arrY.reserve(length);

    for (size_t i = 0; i < length; i++) {
      jsi::Value elementX = pointsX.getValueAtIndex(rt, i);
      jsi::Value elementY = pointsY.getValueAtIndex(rt, i);
      arrX.push_back(elementX.asNumber());
      arrY.push_back(elementY.asNumber());
    }
    return easingName == "steps" ? createStepsEasingFunction(arrX, arrY)
                                 : createLinearEasingFunction(arrX, arrY);
  } else {
    throw std::runtime_error(std::string(
        "[Reanimated] Easing function with name '" + easingName +
        "' is not defined."));
  }
}

} // namespace reanimated
