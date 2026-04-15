#include <reanimated/CSS/InterpolatorRegistry.h>
#include <reanimated/CSS/utils/props.h>

#include <string>

namespace reanimated::css {

bool isDiscreteProperty(const std::string &propName, const std::string &nativeComponentName) {
  const auto &interpolators = getComponentInterpolators(nativeComponentName);
  const auto it = interpolators.find(propName);
  if (it == interpolators.end()) {
    return false;
  }
  return it->second->isDiscreteProperty();
}

} // namespace reanimated::css
