#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

namespace reanimated {
namespace Interpolators {

InterpolatorFactoryFunction object(
    const PropertiesInterpolatorFactories &factories) {
  return [factories](
             const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
             const std::vector<std::string> &propertyPath) {
    return std::make_shared<ObjectPropertiesInterpolator>(
        factories, viewStylesRepository, propertyPath);
  };
}

InterpolatorFactoryFunction transforms(
    const PropertiesInterpolatorFactories &factories) {
  return [factories](
             const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
             const std::vector<std::string> &propertyPath)
             -> std::shared_ptr<Interpolator> {
    return std::make_shared<TransformsStyleInterpolator>(
        factories, viewStylesRepository, propertyPath);
  };
}

InterpolatorFactoryFunction color(
    const std::optional<ColorArray> &defaultValue) {
  return [defaultValue](
             const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
             const std::vector<std::string> &propertyPath) {
    return std::make_shared<ColorValueInterpolator>(
        defaultValue, viewStylesRepository, propertyPath);
  };
}

InterpolatorFactoryFunction numeric(const std::optional<double> &defaultValue) {
  return [defaultValue](
             const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
             const std::vector<std::string> &propertyPath) {
    return std::make_shared<NumericValueInterpolator>(
        defaultValue, viewStylesRepository, propertyPath);
  };
}

InterpolatorFactoryFunction withUnit(
    std::string baseUnit,
    const std::optional<double> &defaultValue) {
  return [baseUnit, defaultValue](
             const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
             const std::vector<std::string> &propertyPath) {
    return std::make_shared<WithUnitInterpolator>(
        baseUnit, defaultValue, viewStylesRepository, propertyPath);
  };
}

InterpolatorFactoryFunction matrix(
    const std::optional<std::vector<double>> &defaultValue) {
  return [defaultValue](
             const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
             const std::vector<std::string> &propertyPath) {
    return std::make_shared<MatrixValueInterpolator>(
        defaultValue, viewStylesRepository, propertyPath);
  };
}

InterpolatorFactoryFunction steps(const std::optional<int> &defaultValue) {
  return [defaultValue](
             const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
             const std::vector<std::string> &propertyPath) {
    return std::make_shared<NumberStepsInterpolator>(
        defaultValue, viewStylesRepository, propertyPath);
  };
}

InterpolatorFactoryFunction discrete(
    const std::optional<std::string> &defaultValue) {
  return [defaultValue](
             const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
             const std::vector<std::string> &propertyPath) {
    return std::make_shared<DiscreteStringInterpolator>(
        defaultValue, viewStylesRepository, propertyPath);
  };
}

InterpolatorFactoryFunction relativeOrNumeric(
    TargetType relativeTo,
    const std::string &relativeProperty,
    const std::optional<RelativeOrNumericInterpolatorValue> &defaultValue) {
  return [relativeTo, relativeProperty, defaultValue](
             const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
             const std::vector<std::string> &propertyPath) {
    return std::make_shared<RelativeOrNumericValueInterpolator>(
        relativeTo,
        relativeProperty,
        defaultValue,
        viewStylesRepository,
        propertyPath);
  };
}

} // namespace Interpolators
} // namespace reanimated
