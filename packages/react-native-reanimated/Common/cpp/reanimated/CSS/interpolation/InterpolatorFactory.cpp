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
      const TransformsInterpolatorFactories &factories)
      : factories_(factories) {}

  std::shared_ptr<PropertyInterpolator> create(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath) const override {
    return std::make_shared<TransformsStyleInterpolator>(
        factories_, viewStylesRepository, propertyPath);
  }

 protected:
  const TransformsInterpolatorFactories factories_;
};

template <typename InterpolatorType, typename ValueType>
class AbsoluteTransformInterpolatorFactory
    : public TransformInterpolatorFactory {
 public:
  AbsoluteTransformInterpolatorFactory(const ValueType &defaultValue)
      : defaultValue_(defaultValue) {}

  std::shared_ptr<TransformInterpolator> create(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath) const override {
    return std::make_shared<InterpolatorType>(defaultValue_, propertyPath_);
  }

 private:
  const PropertyPath propertyPath_;
  const ValueType defaultValue_;
};

class RelativeOrNumericTransformInterpolatorFactory
    : public TransformInterpolatorFactory {
 public:
  RelativeOrNumericTransformInterpolatorFactory(
      const RelativeTo relativeTo,
      const std::string &relativeProperty,
      const UnitValue &defaultValue)
      : relativeTo_(relativeTo),
        relativeProperty_(relativeProperty),
        defaultValue_(defaultValue) {}

  std::shared_ptr<TransformInterpolator> create(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath) const override {
    return std::make_shared<RelativeOrNumericTransformInterpolator>(
        relativeTo_,
        relativeProperty_,
        defaultValue_,
        viewStylesRepository,
        propertyPath);
  }

 private:
  const RelativeTo relativeTo_;
  const std::string relativeProperty_;
  const UnitValue defaultValue_;
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
    const TransformsInterpolatorFactories &factories) {
  return std::make_shared<TransformsStyleInterpolatorFactory>(factories);
}

/**
 * Transform interpolators
 */

std::shared_ptr<TransformInterpolatorFactory> numericTransform(
    const double &defaultValue) {
  return std::make_shared<AbsoluteTransformInterpolatorFactory<
      NumericTransformInterpolator,
      double>>(defaultValue);
}

std::shared_ptr<TransformInterpolatorFactory> angleTransform(
    const AngleValue &defaultValue) {
  return std::make_shared<AbsoluteTransformInterpolatorFactory<
      AngleTransformInterpolator,
      AngleValue>>(defaultValue);
}

std::shared_ptr<TransformInterpolatorFactory> relativeOrNumericTransform(
    const RelativeTo relativeTo,
    const std::string &relativeProperty,
    const UnitValue &defaultValue) {
  return std::make_shared<RelativeOrNumericTransformInterpolatorFactory>(
      relativeTo, relativeProperty, defaultValue);
}

std::shared_ptr<TransformInterpolatorFactory> matrixTransform(
    const TransformMatrix &defaultValue) {
  return std::make_shared<AbsoluteTransformInterpolatorFactory<
      MatrixTransformInterpolator,
      TransformMatrix>>(defaultValue);
}

} // namespace Interpolators
} // namespace reanimated
