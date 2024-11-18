#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

#include <string>

namespace reanimated {

class DiscreteStringInterpolator final : public ValueInterpolator<std::string> {
 public:
  using ValueInterpolator<std::string>::ValueInterpolator;

 protected:
  std::string prepareKeyframeValue(jsi::Runtime &rt, const jsi::Value &value)
      const override;

  jsi::Value convertResultToJSI(jsi::Runtime &rt, const std::string &value)
      const override;

  std::string interpolate(
      double localProgress,
      const std::string &fromValue,
      const std::string &toValue,
      const PropertyInterpolationUpdateContext &context) const override;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
