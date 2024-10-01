#pragma once

#include <reanimated/CSS/interpolation/Interpolator.h>
#include <reanimated/CSS/interpolation/groups/ObjectPropertiesInterpolator.h>
#include <reanimated/CSS/interpolation/groups/TransformsStyleInterpolator.h>
#include <reanimated/CSS/interpolation/values/ColorValueInterpolator.h>
#include <reanimated/CSS/interpolation/values/DiscreteStringInterpolator.h>
#include <reanimated/CSS/interpolation/values/MatrixValueInterpolator.h>
#include <reanimated/CSS/interpolation/values/NumberStepsInterpolator.h>
#include <reanimated/CSS/interpolation/values/NumericValueInterpolator.h>
#include <reanimated/CSS/interpolation/values/RelativeOrNumericValueInterpolator.h>
#include <reanimated/CSS/interpolation/values/WithUnitInterpolator.h>

namespace reanimated {
namespace Interpolators {

InterpolatorFactoryFunction object(
    const ObjectPropertiesInterpolatorFactories &factories);

InterpolatorFactoryFunction transforms(
    const TransformPropertyInterpolatorFactories &factories);

InterpolatorFactoryFunction color(
    const std::optional<ColorArray> &defaultValue);
InterpolatorFactoryFunction color(const unsigned &defaultValue) {
  return color(ColorValueInterpolator::toColorArray(defaultValue));
}
InterpolatorFactoryFunction color() {
  return color(std::nullopt);
}

InterpolatorFactoryFunction numeric(const std::optional<double> &defaultValue);
InterpolatorFactoryFunction numeric() {
  return numeric(std::nullopt);
}

InterpolatorFactoryFunction withUnit(
    std::string baseUnit,
    const std::optional<double> &defaultValue);
InterpolatorFactoryFunction withUnit(std::string baseUnit) {
  return withUnit(baseUnit, std::nullopt);
}

InterpolatorFactoryFunction matrix(
    const std::optional<std::vector<double>> &defaultValue);
InterpolatorFactoryFunction matrix() {
  return matrix(std::nullopt);
}

InterpolatorFactoryFunction steps(const std::optional<int> &defaultValue);
InterpolatorFactoryFunction steps() {
  return steps(std::nullopt);
}

InterpolatorFactoryFunction discrete(
    const std::optional<std::string> &defaultValue);
InterpolatorFactoryFunction discrete() {
  return discrete(std::nullopt);
}

InterpolatorFactoryFunction relativeOrNumeric(
    TargetType relativeTo,
    const std::string &relativeProperty,
    const std::optional<RelativeOrNumericInterpolatorValue> &defaultValue);
InterpolatorFactoryFunction relativeOrNumeric(
    TargetType relativeTo,
    const std::string &relativeProperty,
    const double &defaultValue) {
  return relativeOrNumeric(
      relativeTo,
      relativeProperty,
      RelativeOrNumericInterpolatorValue{defaultValue, false});
}
InterpolatorFactoryFunction relativeOrNumeric(
    TargetType relativeTo,
    const std::string &relativeProperty,
    const std::string &defaultValue) {
  const auto convertedValue =
      RelativeOrNumericValueInterpolator::percentageToNumber(defaultValue);
  return relativeOrNumeric(
      relativeTo,
      relativeProperty,
      RelativeOrNumericInterpolatorValue{convertedValue, true});
}
InterpolatorFactoryFunction relativeOrNumeric(
    TargetType relativeTo,
    const std::string &relativeProperty) {
  return relativeOrNumeric(relativeTo, relativeProperty, std::nullopt);
}

} // namespace Interpolators
} // namespace reanimated
