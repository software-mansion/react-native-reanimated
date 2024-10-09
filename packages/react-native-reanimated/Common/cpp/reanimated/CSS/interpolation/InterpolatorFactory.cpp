#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

namespace reanimated {
namespace Interpolators {

template <typename InterpolatorType>
class GroupInterpolatorFactory : public InterpolatorFactory {
 public:
  GroupInterpolatorFactory(const PropertiesInterpolatorFactories &factories)
      : factories_(factories) {}

  std::shared_ptr<Interpolator> create(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath) const override {
    return std::make_shared<InterpolatorType>(
        factories_, viewStylesRepository, propertyPath);
  }

 protected:
  const PropertiesInterpolatorFactories factories_;
};

template <typename InterpolatorType, typename ValueType>
class ValueInterpolatorFactory : public InterpolatorFactory {
 public:
  ValueInterpolatorFactory(const std::optional<ValueType> &defaultValue)
      : defaultValue_(defaultValue) {}

  std::shared_ptr<Interpolator> create(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath) const override {
    return std::make_shared<InterpolatorType>(
        defaultValue_, viewStylesRepository, propertyPath);
  }

 private:
  const std::optional<ValueType> defaultValue_;
};

template <typename ValueType>
class WithUnitInterpolatorFactory : public InterpolatorFactory {
 public:
  WithUnitInterpolatorFactory(
      const std::string &baseUnit,
      const std::optional<ValueType> &defaultValue)
      : defaultValue_(defaultValue), baseUnit_(baseUnit) {}

  std::shared_ptr<Interpolator> create(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath) const override {
    return std::make_shared<WithUnitInterpolator>(
        baseUnit_, defaultValue_, viewStylesRepository, propertyPath);
  }

 private:
  const std::string baseUnit_;
  const std::optional<ValueType> defaultValue_;
};

template <typename ValueType>
class RelativeOrNumericInterpolatorFactory : public InterpolatorFactory {
 public:
  RelativeOrNumericInterpolatorFactory(
      const TargetType relativeTo,
      const std::string &relativeProperty,
      const std::optional<ValueType> &defaultValue)
      : defaultValue_(defaultValue),
        relativeTo_(relativeTo),
        relativeProperty_(relativeProperty) {}

  std::shared_ptr<Interpolator> create(
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
  const TargetType relativeTo_;
  const std::string relativeProperty_;
  const std::optional<ValueType> defaultValue_;
};

std::shared_ptr<InterpolatorFactory> object(
    const PropertiesInterpolatorFactories &factories) {
  return std::make_shared<
      GroupInterpolatorFactory<ObjectPropertiesInterpolator>>(factories);
}

std::shared_ptr<InterpolatorFactory> transforms(
    const PropertiesInterpolatorFactories &factories) {
  return std::make_shared<
      GroupInterpolatorFactory<TransformsStyleInterpolator>>(factories);
}

std::shared_ptr<InterpolatorFactory> color(
    const std::optional<ColorArray> &defaultValue) {
  return std::make_shared<
      ValueInterpolatorFactory<ColorValueInterpolator, ColorArray>>(
      defaultValue);
}

std::shared_ptr<InterpolatorFactory> numeric(
    const std::optional<double> &defaultValue) {
  return std::make_shared<
      ValueInterpolatorFactory<NumericValueInterpolator, double>>(defaultValue);
}

std::shared_ptr<InterpolatorFactory> withUnit(
    const std::string baseUnit,
    const std::optional<double> &defaultValue) {
  return std::make_shared<WithUnitInterpolatorFactory<double>>(
      baseUnit, defaultValue);
}

std::shared_ptr<InterpolatorFactory> matrix(
    const std::optional<std::vector<double>> &defaultValue) {
  return std::make_shared<
      ValueInterpolatorFactory<MatrixValueInterpolator, std::vector<double>>>(
      defaultValue);
}

std::shared_ptr<InterpolatorFactory> steps(
    const std::optional<int> &defaultValue) {
  return std::make_shared<
      ValueInterpolatorFactory<NumberStepsInterpolator, int>>(defaultValue);
}

std::shared_ptr<InterpolatorFactory> discrete(
    const std::optional<std::string> &defaultValue) {
  return std::make_shared<
      ValueInterpolatorFactory<DiscreteStringInterpolator, std::string>>(
      defaultValue);
}

std::shared_ptr<InterpolatorFactory> relativeOrNumeric(
    const TargetType relativeTo,
    const std::string &relativeProperty,
    const std::optional<RelativeOrNumericInterpolatorValue> &defaultValue) {
  return std::make_shared<
      RelativeOrNumericInterpolatorFactory<RelativeOrNumericInterpolatorValue>>(
      relativeTo, relativeProperty, defaultValue);
}

} // namespace Interpolators
} // namespace reanimated
