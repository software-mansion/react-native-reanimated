#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

namespace reanimated {
namespace Interpolators {

class ObjectInterpolatorFactory : public PropertyInterpolatorFactory {
 public:
  ObjectInterpolatorFactory(const PropertiesInterpolatorFactories &factories)
      : factories_(factories) {}

  std::shared_ptr<PropertyInterpolator> create(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath) const override {
    return std::make_shared<ObjectPropertiesInterpolator>(
        factories_, viewStylesRepository, propertyPath);
  }

 protected:
  const PropertiesInterpolatorFactories factories_;
};

template <typename InterpolatorType, typename ValueType>
class ValueInterpolatorFactory : public PropertyInterpolatorFactory {
 public:
  ValueInterpolatorFactory(const std::optional<ValueType> &defaultValue)
      : defaultValue_(defaultValue) {}

  std::shared_ptr<PropertyInterpolator> create(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath) const override {
    return std::make_shared<InterpolatorType>(
        defaultValue_, viewStylesRepository, propertyPath);
  }

 private:
  const std::optional<ValueType> defaultValue_;
};

class RelativeOrNumericInterpolatorFactory
    : public PropertyInterpolatorFactory {
 public:
  RelativeOrNumericInterpolatorFactory(
      const RelativeTo relativeTo,
      const std::string &relativeProperty,
      const std::optional<UnitValue> &defaultValue)
      : defaultValue_(defaultValue),
        relativeTo_(relativeTo),
        relativeProperty_(relativeProperty) {}

  std::shared_ptr<PropertyInterpolator> create(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath) const override {
    return std::make_shared<RelativeOrNumericValueInterpolator>(
        relativeTo_,
        relativeProperty_,
        defaultValue_,
        viewStylesRepository,
        propertyPath);
  }

 private:
  const RelativeTo relativeTo_;
  const std::string relativeProperty_;
  const std::optional<UnitValue> defaultValue_;
};

class TransformsStyleInterpolatorFactory : public PropertyInterpolatorFactory {
 public:
  TransformsStyleInterpolatorFactory(
      const std::shared_ptr<TransformInterpolators> &interpolators)
      : interpolators_(interpolators) {}

  std::shared_ptr<PropertyInterpolator> create(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath) const override {
    return std::make_shared<TransformsStyleInterpolator>(
        interpolators_, viewStylesRepository, propertyPath);
  }

 protected:
  const std::shared_ptr<TransformInterpolators> interpolators_;
};

/**
 * Property interpolators
 */

std::shared_ptr<PropertyInterpolatorFactory> object(
    const PropertiesInterpolatorFactories &factories) {
  return std::make_shared<ObjectInterpolatorFactory>(factories);
}

std::shared_ptr<PropertyInterpolatorFactory> color(
    const std::optional<ColorArray> &defaultValue) {
  return std::make_shared<
      ValueInterpolatorFactory<ColorValueInterpolator, ColorArray>>(
      defaultValue);
}

std::shared_ptr<PropertyInterpolatorFactory> numeric(
    const std::optional<double> &defaultValue) {
  return std::make_shared<
      ValueInterpolatorFactory<NumericValueInterpolator, double>>(defaultValue);
}

std::shared_ptr<PropertyInterpolatorFactory> steps(
    const std::optional<int> &defaultValue) {
  return std::make_shared<
      ValueInterpolatorFactory<NumberStepsInterpolator, int>>(defaultValue);
}

std::shared_ptr<PropertyInterpolatorFactory> discrete(
    const std::optional<std::string> &defaultValue) {
  return std::make_shared<
      ValueInterpolatorFactory<DiscreteStringInterpolator, std::string>>(
      defaultValue);
}

std::shared_ptr<PropertyInterpolatorFactory> relativeOrNumeric(
    const RelativeTo relativeTo,
    const std::string &relativeProperty,
    const std::optional<UnitValue> &defaultValue) {
  return std::make_shared<RelativeOrNumericInterpolatorFactory>(
      relativeTo, relativeProperty, defaultValue);
}

std::shared_ptr<PropertyInterpolatorFactory> transforms(
    const TransformInterpolatorsMap &interpolators) {
  TransformInterpolators result;

  for (const auto &[property, interpolator] : interpolators) {
    result[getTransformOperationType(property)] = interpolator;
  }
  return std::make_shared<TransformsStyleInterpolatorFactory>(
      std::make_shared<TransformInterpolators>(result));
}

/**
 * Transform interpolators
 */

std::shared_ptr<TransformInterpolator> perspective(const double &defaultValue) {
  return std::make_shared<PerspectiveTransformInterpolator>(defaultValue);
}

std::shared_ptr<TransformInterpolator> rotate(const AngleValue &defaultValue) {
  return std::make_shared<RotateTransformInterpolator>(defaultValue);
}
std::shared_ptr<TransformInterpolator> rotateX(const AngleValue &defaultValue) {
  return std::make_shared<RotateXTransformInterpolator>(defaultValue);
}
std::shared_ptr<TransformInterpolator> rotateY(const AngleValue &defaultValue) {
  return std::make_shared<RotateYTransformInterpolator>(defaultValue);
}
std::shared_ptr<TransformInterpolator> rotateZ(const AngleValue &defaultValue) {
  return std::make_shared<RotateZTransformInterpolator>(defaultValue);
}

std::shared_ptr<TransformInterpolator> scale(const double &defaultValue) {
  return std::make_shared<ScaleTransformInterpolator>(defaultValue);
}
std::shared_ptr<TransformInterpolator> scaleX(const double &defaultValue) {
  return std::make_shared<ScaleXTransformInterpolator>(defaultValue);
}
std::shared_ptr<TransformInterpolator> scaleY(const double &defaultValue) {
  return std::make_shared<ScaleYTransformInterpolator>(defaultValue);
}

std::shared_ptr<TransformInterpolator> translateX(
    RelativeTo relativeTo,
    const std::string &relativeProperty,
    const UnitValue &defaultValue) {
  return std::make_shared<TranslateXTransformInterpolator>(
      relativeTo, relativeProperty, defaultValue);
}
std::shared_ptr<TransformInterpolator> translateY(
    RelativeTo relativeTo,
    const std::string &relativeProperty,
    const UnitValue &defaultValue) {
  return std::make_shared<TranslateYTransformInterpolator>(
      relativeTo, relativeProperty, defaultValue);
}

std::shared_ptr<TransformInterpolator> skewX(const AngleValue &defaultValue) {
  return std::make_shared<SkewXTransformInterpolator>(defaultValue);
}
std::shared_ptr<TransformInterpolator> skewY(const AngleValue &defaultValue) {
  return std::make_shared<SkewYTransformInterpolator>(defaultValue);
}

std::shared_ptr<TransformInterpolator> matrix(
    const TransformMatrix &defaultValue) {
  return std::make_shared<MatrixTransformInterpolator>(defaultValue);
}

} // namespace Interpolators
} // namespace reanimated
