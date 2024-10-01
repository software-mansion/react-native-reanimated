#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

namespace reanimated {
namespace Interpolators {

InterpolatorFactoryFunction object(
    const ObjectPropertiesInterpolatorFactories &factories) {
  return [factories](
             jsi::Runtime &rt,
             const jsi::Value &value,
             const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
             const std::vector<std::string> &propertyPath) {
    auto propertiesObject = value.asObject(rt);
    return std::make_shared<ObjectPropertiesInterpolator>(
        rt, propertiesObject, factories, viewStylesRepository, propertyPath);
  };
}

InterpolatorFactoryFunction transforms(
    const TransformPropertyInterpolatorFactories &factories) {
  return [factories](
             jsi::Runtime &rt,
             const jsi::Value &value,
             const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
             const std::vector<std::string> &propertyPath)
             -> std::shared_ptr<Interpolator> {
    auto transformsArray = value.asObject(rt).asArray(rt);
    return std::make_shared<TransformsStyleInterpolator>(
        rt, transformsArray, factories, viewStylesRepository, propertyPath);
  };
}

InterpolatorFactoryFunction color(
    const std::optional<ColorArray> &defaultValue) {
  return [defaultValue](
             jsi::Runtime &rt,
             const jsi::Value &value,
             const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
             const std::vector<std::string> &propertyPath) {
    auto interpolator = std::make_shared<ColorValueInterpolator>(
        defaultValue, viewStylesRepository, propertyPath);
    interpolator->initialize(rt, value);
    return interpolator;
  };
}

InterpolatorFactoryFunction numeric(const std::optional<double> &defaultValue) {
  return [defaultValue](
             jsi::Runtime &rt,
             const jsi::Value &value,
             const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
             const std::vector<std::string> &propertyPath) {
    auto interpolator = std::make_shared<NumericValueInterpolator>(
        defaultValue, viewStylesRepository, propertyPath);
    interpolator->initialize(rt, value);
    return interpolator;
  };
}

InterpolatorFactoryFunction withUnit(
    std::string baseUnit,
    const std::optional<double> &defaultValue) {
  return [baseUnit, defaultValue](
             jsi::Runtime &rt,
             const jsi::Value &value,
             const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
             const std::vector<std::string> &propertyPath) {
    auto interpolator = std::make_shared<WithUnitInterpolator>(
        baseUnit, defaultValue, viewStylesRepository, propertyPath);
    interpolator->initialize(rt, value);
    return interpolator;
  };
}

InterpolatorFactoryFunction matrix(
    const std::optional<std::vector<double>> &defaultValue) {
  return [defaultValue](
             jsi::Runtime &rt,
             const jsi::Value &value,
             const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
             const std::vector<std::string> &propertyPath) {
    auto interpolator = std::make_shared<MatrixValueInterpolator>(
        defaultValue, viewStylesRepository, propertyPath);
    interpolator->initialize(rt, value);
    return interpolator;
  };
}

InterpolatorFactoryFunction steps(const std::optional<int> &defaultValue) {
  return [defaultValue](
             jsi::Runtime &rt,
             const jsi::Value &value,
             const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
             const std::vector<std::string> &propertyPath) {
    auto interpolator = std::make_shared<NumberStepsInterpolator>(
        defaultValue, viewStylesRepository, propertyPath);
    interpolator->initialize(rt, value);
    return interpolator;
  };
}

InterpolatorFactoryFunction discrete(
    const std::optional<std::string> &defaultValue) {
  return [defaultValue](
             jsi::Runtime &rt,
             const jsi::Value &value,
             const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
             const std::vector<std::string> &propertyPath) {
    auto interpolator = std::make_shared<DiscreteStringInterpolator>(
        defaultValue, viewStylesRepository, propertyPath);
    interpolator->initialize(rt, value);
    return interpolator;
  };
}

InterpolatorFactoryFunction relativeOrNumeric(
    TargetType relativeTo,
    const std::string &relativeProperty,
    const std::optional<RelativeOrNumericInterpolatorValue> &defaultValue) {
  return [relativeTo, relativeProperty, defaultValue](
             jsi::Runtime &rt,
             const jsi::Value &value,
             const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
             const std::vector<std::string> &propertyPath) {
    auto interpolator = std::make_shared<RelativeOrNumericValueInterpolator>(
        relativeTo,
        relativeProperty,
        defaultValue,
        viewStylesRepository,
        propertyPath);
    interpolator->initialize(rt, value);
    return interpolator;
  };
}

} // namespace Interpolators
} // namespace reanimated
