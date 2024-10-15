#pragma once

#include <reanimated/CSS/interpolation/groups/ObjectPropertiesInterpolator.h>
#include <reanimated/CSS/interpolation/groups/TransformsStyleInterpolator.h>

#include <reanimated/CSS/interpolation/values/ColorValueInterpolator.h>
#include <reanimated/CSS/interpolation/values/DiscreteStringInterpolator.h>
#include <reanimated/CSS/interpolation/values/NumberStepsInterpolator.h>
#include <reanimated/CSS/interpolation/values/NumericValueInterpolator.h>
#include <reanimated/CSS/interpolation/values/RelativeOrNumericValueInterpolator.h>

#include <reanimated/CSS/interpolation/transforms/AngleTransformInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/MatrixTransformInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/NumericTransformInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/RelativeOrNumericTransformInterpolator.h>

namespace reanimated {
namespace Interpolators {

/**
 * Property interpolators
 */

std::shared_ptr<PropertyInterpolatorFactory> object(
    const PropertiesInterpolatorFactories &factories);

std::shared_ptr<PropertyInterpolatorFactory> color(
    const std::optional<ColorArray> &defaultValue);
std::shared_ptr<PropertyInterpolatorFactory> color(
    const unsigned &defaultValue) {
  return color(ColorValueInterpolator::toColorArray(defaultValue));
}
std::shared_ptr<PropertyInterpolatorFactory> color() {
  return color(std::nullopt);
}

std::shared_ptr<PropertyInterpolatorFactory> numeric(
    const std::optional<double> &defaultValue);
std::shared_ptr<PropertyInterpolatorFactory> numeric() {
  return numeric(std::nullopt);
}

std::shared_ptr<PropertyInterpolatorFactory> steps(
    const std::optional<int> &defaultValue);
std::shared_ptr<PropertyInterpolatorFactory> steps() {
  return steps(std::nullopt);
}

std::shared_ptr<PropertyInterpolatorFactory> discrete(
    const std::optional<std::string> &defaultValue);
std::shared_ptr<PropertyInterpolatorFactory> discrete() {
  return discrete(std::nullopt);
}

std::shared_ptr<PropertyInterpolatorFactory> relativeOrNumeric(
    RelativeTo relativeTo,
    const std::string &relativeProperty,
    const std::optional<UnitValue> &defaultValue);
std::shared_ptr<PropertyInterpolatorFactory> relativeOrNumeric(
    RelativeTo relativeTo,
    const std::string &relativeProperty,
    const double &defaultValue) {
  return relativeOrNumeric(
      relativeTo, relativeProperty, UnitValue(defaultValue));
}
std::shared_ptr<PropertyInterpolatorFactory> relativeOrNumeric(
    RelativeTo relativeTo,
    const std::string &relativeProperty,
    const std::string &defaultValue) {
  return relativeOrNumeric(
      relativeTo, relativeProperty, UnitValue(defaultValue));
}
std::shared_ptr<PropertyInterpolatorFactory> relativeOrNumeric(
    RelativeTo relativeTo,
    const std::string &relativeProperty) {
  return relativeOrNumeric(relativeTo, relativeProperty, std::nullopt);
}

std::shared_ptr<PropertyInterpolatorFactory> transforms(
    const TransformsInterpolatorFactories &factories);

/**
 * Transform interpolators
 */

std::shared_ptr<TransformInterpolatorFactory> numericTransform(
    const double &defaultValue);

std::shared_ptr<TransformInterpolatorFactory> angleTransform(
    const AngleValue &defaultValue);
std::shared_ptr<TransformInterpolatorFactory> angleTransform(
    const std::string &defaultValue) {
  return angleTransform(AngleValue(defaultValue));
}

std::shared_ptr<TransformInterpolatorFactory> relativeOrNumericTransform(
    RelativeTo relativeTo,
    const std::string &relativeProperty,
    const UnitValue &defaultValue);
std::shared_ptr<TransformInterpolatorFactory> relativeOrNumericTransform(
    RelativeTo relativeTo,
    const std::string &relativeProperty,
    const double &defaultValue) {
  return relativeOrNumericTransform(
      relativeTo, relativeProperty, UnitValue(defaultValue));
}
std::shared_ptr<TransformInterpolatorFactory> relativeOrNumericTransform(
    RelativeTo relativeTo,
    const std::string &relativeProperty,
    const std::string &defaultValue) {
  return relativeOrNumericTransform(
      relativeTo, relativeProperty, UnitValue(defaultValue));
}

std::shared_ptr<TransformInterpolatorFactory> matrixTransform(
    const TransformMatrix &defaultValue);

} // namespace Interpolators
} // namespace reanimated
