#pragma once

#include <react/renderer/graphics/Rect.h>
#include <string>

namespace reanimated {

struct NativeLayoutAnimation {
  std::string key;
  std::function<double(const facebook::react::Rect &baseFrame)> getInitialValue;
  double targetValue;
};

} // namespace reanimated
