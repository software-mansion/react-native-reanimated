#pragma once

#include <reanimated/CSS/interpolation/groups/ObjectPropertiesInterpolator.h>
#include <reanimated/CSS/interpolation/groups/TransformsStyleInterpolator.h>

#include <reanimated/CSS/interpolation/values/ColorValueInterpolator.h>
#include <reanimated/CSS/interpolation/values/DiscreteStringInterpolator.h>
#include <reanimated/CSS/interpolation/values/NumberStepsInterpolator.h>
#include <reanimated/CSS/interpolation/values/NumericValueInterpolator.h>
#include <reanimated/CSS/interpolation/values/RelativeOrNumericValueInterpolator.h>

#include <reanimated/CSS/interpolation/transforms/MatrixTransformInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/PerspectiveTransformInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/RotateTransformInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/ScaleTransformInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/SkewTransformInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/TranslateTransformInterpolator.h>

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
    const TransformInterpolatorsMap &interpolators);

/**
 * Transform interpolators
 */

std::shared_ptr<TransformInterpolator> perspective(const double &defaultValue);

std::shared_ptr<TransformInterpolator> rotate(const AngleValue &defaultValue);
std::shared_ptr<TransformInterpolator> rotate(const std::string &defaultValue) {
  return rotate(AngleValue(defaultValue));
}
std::shared_ptr<TransformInterpolator> rotateX(const AngleValue &defaultValue);
std::shared_ptr<TransformInterpolator> rotateX(
    const std::string &defaultValue) {
  return rotateX(AngleValue(defaultValue));
}
std::shared_ptr<TransformInterpolator> rotateY(const AngleValue &defaultValue);
std::shared_ptr<TransformInterpolator> rotateY(
    const std::string &defaultValue) {
  return rotateY(AngleValue(defaultValue));
}
std::shared_ptr<TransformInterpolator> rotateZ(const AngleValue &defaultValue);
std::shared_ptr<TransformInterpolator> rotateZ(
    const std::string &defaultValue) {
  return rotateZ(AngleValue(defaultValue));
}

std::shared_ptr<TransformInterpolator> scale(const double &defaultValue);
std::shared_ptr<TransformInterpolator> scaleX(const double &defaultValue);
std::shared_ptr<TransformInterpolator> scaleY(const double &defaultValue);

std::shared_ptr<TransformInterpolator> translateX(
    RelativeTo relativeTo,
    const std::string &relativeProperty,
    const UnitValue &defaultValue);
std::shared_ptr<TransformInterpolator> translateX(
    RelativeTo relativeTo,
    const std::string &relativeProperty,
    const double &defaultValue) {
  return translateX(relativeTo, relativeProperty, UnitValue(defaultValue));
}
std::shared_ptr<TransformInterpolator> translateY(
    RelativeTo relativeTo,
    const std::string &relativeProperty,
    const UnitValue &defaultValue);
std::shared_ptr<TransformInterpolator> translateY(
    RelativeTo relativeTo,
    const std::string &relativeProperty,
    const double &defaultValue) {
  return translateY(relativeTo, relativeProperty, UnitValue(defaultValue));
}

std::shared_ptr<TransformInterpolator> skewX(const AngleValue &defaultValue);
std::shared_ptr<TransformInterpolator> skewX(const std::string &defaultValue) {
  return skewX(AngleValue(defaultValue));
}
std::shared_ptr<TransformInterpolator> skewY(const AngleValue &defaultValue);
std::shared_ptr<TransformInterpolator> skewY(const std::string &defaultValue) {
  return skewY(AngleValue(defaultValue));
}

std::shared_ptr<TransformInterpolator> matrix(
    const TransformMatrix &defaultValue);

} // namespace Interpolators
} // namespace reanimated
