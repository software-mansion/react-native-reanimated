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

std::shared_ptr<InterpolatorFactory> object(
    const PropertiesInterpolatorFactories &factories);

std::shared_ptr<InterpolatorFactory> transforms(
    const PropertiesInterpolatorFactories &factories);

std::shared_ptr<InterpolatorFactory> color(
    const std::optional<ColorArray> &defaultValue);
std::shared_ptr<InterpolatorFactory> color(const unsigned &defaultValue) {
  return color(ColorValueInterpolator::toColorArray(defaultValue));
}
std::shared_ptr<InterpolatorFactory> color() {
  return color(std::nullopt);
}

std::shared_ptr<InterpolatorFactory> numeric(
    const std::optional<double> &defaultValue);
std::shared_ptr<InterpolatorFactory> numeric() {
  return numeric(std::nullopt);
}

std::shared_ptr<InterpolatorFactory> withUnit(
    std::string baseUnit,
    const std::optional<double> &defaultValue);
std::shared_ptr<InterpolatorFactory> withUnit(std::string baseUnit) {
  return withUnit(baseUnit, std::nullopt);
}

std::shared_ptr<InterpolatorFactory> matrix(
    const std::optional<std::vector<double>> &defaultValue);
std::shared_ptr<InterpolatorFactory> matrix() {
  return matrix(std::nullopt);
}

std::shared_ptr<InterpolatorFactory> steps(
    const std::optional<int> &defaultValue);
std::shared_ptr<InterpolatorFactory> steps() {
  return steps(std::nullopt);
}

std::shared_ptr<InterpolatorFactory> discrete(
    const std::optional<std::string> &defaultValue);
std::shared_ptr<InterpolatorFactory> discrete() {
  return discrete(std::nullopt);
}

std::shared_ptr<InterpolatorFactory> relativeOrNumeric(
    TargetType relativeTo,
    const std::string &relativeProperty,
    const std::optional<RelativeOrNumericInterpolatorValue> &defaultValue);
std::shared_ptr<InterpolatorFactory> relativeOrNumeric(
    TargetType relativeTo,
    const std::string &relativeProperty,
    const double &defaultValue) {
  return relativeOrNumeric(
      relativeTo,
      relativeProperty,
      RelativeOrNumericInterpolatorValue{defaultValue, false});
}
std::shared_ptr<InterpolatorFactory> relativeOrNumeric(
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
std::shared_ptr<InterpolatorFactory> relativeOrNumeric(
    TargetType relativeTo,
    const std::string &relativeProperty) {
  return relativeOrNumeric(relativeTo, relativeProperty, std::nullopt);
}

} // namespace Interpolators
} // namespace reanimated
