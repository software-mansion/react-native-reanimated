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

ColorChannels extractColorChannels(int64_t numberValue) {
  // Colors above 2^31 arrive as signed negatives (JS applies `| 0`); cast
  // through int32_t to preserve the bit pattern.
  const uint32_t color =
      numberValue < 0 ? static_cast<uint32_t>(static_cast<int32_t>(numberValue)) : static_cast<uint32_t>(numberValue);
  return {
      static_cast<uint8_t>((color >> 16) & 0xFF),
      static_cast<uint8_t>((color >> 8) & 0xFF),
      static_cast<uint8_t>(color & 0xFF),
      static_cast<uint8_t>((color >> 24) & 0xFF),
  };
}

} // namespace reanimated::css
