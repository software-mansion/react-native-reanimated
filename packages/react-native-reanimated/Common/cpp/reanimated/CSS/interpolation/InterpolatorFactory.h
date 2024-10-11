#pragma once

#include <reanimated/CSS/interpolation/Interpolator.h>
#include <reanimated/CSS/interpolation/groups/ObjectPropertiesInterpolator.h>
#include <reanimated/CSS/interpolation/properties/ColorValueInterpolator.h>
#include <reanimated/CSS/interpolation/properties/DiscreteStringInterpolator.h>
#include <reanimated/CSS/interpolation/properties/NumberStepsInterpolator.h>
#include <reanimated/CSS/interpolation/properties/NumericValueInterpolator.h>
#include <reanimated/CSS/interpolation/properties/RelativeOrNumericValueInterpolator.h>
#include <reanimated/CSS/interpolation/properties/TransformsStyleInterpolator.h>

namespace reanimated {
namespace Interpolators {

std::shared_ptr<InterpolatorFactory> object(
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

std::shared_ptr<InterpolatorFactory> transforms(const Transform &defaultValue);

} // namespace Interpolators
} // namespace reanimated
