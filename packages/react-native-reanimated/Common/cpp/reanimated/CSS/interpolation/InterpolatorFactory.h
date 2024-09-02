#pragma once

#include <reanimated/CSS/interpolation/Interpolator.h>
#include <reanimated/CSS/interpolation/groups/ObjectPropertiesInterpolator.h>
#include <reanimated/CSS/interpolation/groups/TransformsStyleInterpolator.h>
#include <reanimated/CSS/interpolation/values/ColorValueInterpolator.h>
#include <reanimated/CSS/interpolation/values/DiscreteNumberInterpolator.h>
#include <reanimated/CSS/interpolation/values/DiscreteStringInterpolator.h>
#include <reanimated/CSS/interpolation/values/MatrixValueInterpolator.h>
#include <reanimated/CSS/interpolation/values/NumericValueInterpolator.h>
#include <reanimated/CSS/interpolation/values/RelativeOrNumericValueInterpolator.h>
#include <reanimated/CSS/interpolation/values/WithUnitInterpolator.h>

#include <jsi/jsi.h>
#include <memory>
#include <string>

namespace reanimated {

class InterpolatorFactory {
 public:
  static InterpolatorFactoryFunction object(
      const ObjectPropertiesInterpolatorFactories &factories);

  static InterpolatorFactoryFunction transforms(
      const TransformPropertyInterpolatorFactories &factories);

  static std::shared_ptr<Interpolator> color(
      jsi::Runtime &rt,
      const jsi::Value &value);

  static std::shared_ptr<Interpolator> numeric(
      jsi::Runtime &rt,
      const jsi::Value &value);

  static std::shared_ptr<Interpolator> withUnit(
      jsi::Runtime &rt,
      const jsi::Value &value);

  static std::shared_ptr<Interpolator> matrix(
      jsi::Runtime &rt,
      const jsi::Value &value);

  static std::shared_ptr<Interpolator> discreteNumber(
      jsi::Runtime &rt,
      const jsi::Value &value);

  static std::shared_ptr<Interpolator> discreteString(
      jsi::Runtime &rt,
      const jsi::Value &value);

  static InterpolatorFactoryFunction relativeOrNumeric(
      TargetType relativeTo,
      const std::string &relativeProperty);

 private:
  template <typename T>
  static std::shared_ptr<Interpolator> createValueInterpolator(
      jsi::Runtime &rt,
      const jsi::Value &value);
};

} // namespace reanimated
