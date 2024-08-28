#include <reanimated/CSS/EasingFunctions.h>

namespace reanimated {

double linear(double x) {
  return x;
}

double easeInOutBack(double x) {
  auto c1 = 1.70158;
  auto c2 = c1 * 1.525;

  return x < 0.5 ? (pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
                 : (pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;
}

inline const std::unordered_map<std::string, std::function<double(double)>>
    easingMap = {{"linear", linear}, {"ease-in-out-back", easeInOutBack}};

std::function<double(double)> getEasingFunction(const std::string &name) {
  auto it = easingMap.find(name);
  if (it != easingMap.end()) {
    return it->second;
  } else {
    throw std::runtime_error(std::string(
        "[Reanimated] Easing function with name '" + name +
        "' is not defined."));
  }
}

} // namespace reanimated
