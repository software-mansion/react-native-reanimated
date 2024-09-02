#pragma once

#include <reanimated/CSS/interpolation/Interpolator.h>
#include <reanimated/CSS/interpolation/groups/ObjectPropertiesInterpolator.h>
#include <reanimated/CSS/interpolation/groups/TransformsStyleInterpolator.h>
#include <reanimated/CSS/interpolation/values/NumericValueInterpolator.h>

#include <jsi/jsi.h>
#include <memory>

namespace reanimated {

class InterpolatorFactory {
 public:
  static InterpolatorFactoryFunction object(
      const ObjectPropertiesInterpolatorFactories &factories);

  static InterpolatorFactoryFunction transform(
      const TransformPropertyInterpolatorFactories &factories);

  static std::shared_ptr<Interpolator> numeric(
      jsi::Runtime &rt,
      const jsi::Value &value);
};

} // namespace reanimated
