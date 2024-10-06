#pragma once

#include <reanimated/CSS/interpolation/groups/GroupInterpolator.h>

namespace reanimated {

class ObjectPropertiesInterpolator : public GroupInterpolator {
 public:
  using GroupInterpolator::GroupInterpolator;

  void setKeyframes(jsi::Runtime &rt, const jsi::Value &keyframes) override;

 protected:
  jsi::Value mapInterpolators(
      jsi::Runtime &rt,
      std::function<jsi::Value(Interpolator &)> callback) const override;
};

} // namespace reanimated
