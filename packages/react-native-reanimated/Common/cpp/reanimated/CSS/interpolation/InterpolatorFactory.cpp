#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

namespace reanimated {
namespace Interpolators {

InterpolatorFactoryFunction object(
    const ObjectPropertiesInterpolatorFactories &factories) {
  return [factories](jsi::Runtime &rt, const jsi::Value &value) {
    auto propertiesObject = value.asObject(rt);
    return std::make_shared<ObjectPropertiesInterpolator>(
        rt, propertiesObject, factories);
  };
}

InterpolatorFactoryFunction transforms(
    const TransformPropertyInterpolatorFactories &factories) {
  return [factories](
             jsi::Runtime &rt,
             const jsi::Value &value) -> std::shared_ptr<Interpolator> {
    auto transformsArray = value.asObject(rt).asArray(rt);
    return std::make_shared<TransformsStyleInterpolator>(
        rt, transformsArray, factories);
  };
}

InterpolatorFactoryFunction color(
    const std::optional<ColorArray> &defaultValue) {
  return [defaultValue](jsi::Runtime &rt, const jsi::Value &value) {
    auto interpolator = std::make_shared<ColorValueInterpolator>(defaultValue);
    interpolator->initialize(rt, value);
    return interpolator;
  };
}

InterpolatorFactoryFunction numeric(const std::optional<double> &defaultValue) {
  return [defaultValue](jsi::Runtime &rt, const jsi::Value &value) {
    auto interpolator =
        std::make_shared<NumericValueInterpolator>(defaultValue);
    interpolator->initialize(rt, value);
    return interpolator;
  };
}

InterpolatorFactoryFunction withUnit(
    std::string baseUnit,
    const std::optional<double> &defaultValue) {
  return [baseUnit, defaultValue](jsi::Runtime &rt, const jsi::Value &value) {
    auto interpolator =
        std::make_shared<WithUnitInterpolator>(baseUnit, defaultValue);
    interpolator->initialize(rt, value);
    return interpolator;
  };
}

InterpolatorFactoryFunction matrix(
    const std::optional<std::vector<double>> &defaultValue) {
  return [defaultValue](jsi::Runtime &rt, const jsi::Value &value) {
    auto interpolator = std::make_shared<MatrixValueInterpolator>(defaultValue);
    interpolator->initialize(rt, value);
    return interpolator;
  };
}

InterpolatorFactoryFunction steps(const std::optional<int> &defaultValue) {
  return [defaultValue](jsi::Runtime &rt, const jsi::Value &value) {
    auto interpolator = std::make_shared<NumberStepsInterpolator>(defaultValue);
    interpolator->initialize(rt, value);
    return interpolator;
  };
}

InterpolatorFactoryFunction discrete(
    const std::optional<std::string> &defaultValue) {
  return [defaultValue](jsi::Runtime &rt, const jsi::Value &value) {
    auto interpolator =
        std::make_shared<DiscreteStringInterpolator>(defaultValue);
    interpolator->initialize(rt, value);
    return interpolator;
  };
}

InterpolatorFactoryFunction relativeOrNumeric(
    TargetType relativeTo,
    const std::string &relativeProperty,
    const std::optional<RelativeOrNumericInterpolatorValue> &defaultValue) {
  return [relativeTo, relativeProperty, defaultValue](
             jsi::Runtime &rt, const jsi::Value &value) {
    auto interpolator = std::make_shared<RelativeOrNumericValueInterpolator>(
        relativeTo, relativeProperty, defaultValue);
    interpolator->initialize(rt, value);
    return interpolator;
  };
}

} // namespace Interpolators
} // namespace reanimated
