#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

namespace reanimated {

InterpolatorFactoryFunction InterpolatorFactory::object(
    const ObjectPropertiesInterpolatorFactories &factories) {
  return [factories](jsi::Runtime &rt, const jsi::Value &value) {
    auto propertiesObject = value.asObject(rt);
    return std::make_shared<ObjectPropertiesInterpolator>(
        rt, propertiesObject, factories);
  };
}

InterpolatorFactoryFunction InterpolatorFactory::transforms(
    const TransformPropertyInterpolatorFactories &factories) {
  return [factories](
             jsi::Runtime &rt,
             const jsi::Value &value) -> std::shared_ptr<Interpolator> {
    auto transformsArray = value.asObject(rt).asArray(rt);
    return std::make_shared<TransformsStyleInterpolator>(
        rt, transformsArray, factories);
  };
}

std::shared_ptr<Interpolator> InterpolatorFactory::color(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  return createValueInterpolator<ColorValueInterpolator>(rt, value);
}

std::shared_ptr<Interpolator> InterpolatorFactory::numeric(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  return createValueInterpolator<NumericValueInterpolator>(rt, value);
}

std::shared_ptr<Interpolator> InterpolatorFactory::withUnit(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  return createValueInterpolator<WithUnitInterpolator>(rt, value);
}

std::shared_ptr<Interpolator> InterpolatorFactory::matrix(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  return createValueInterpolator<MatrixValueInterpolator>(rt, value);
}

std::shared_ptr<Interpolator> InterpolatorFactory::discreteNumber(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  return createValueInterpolator<DiscreteNumberInterpolator>(rt, value);
}

std::shared_ptr<Interpolator> InterpolatorFactory::discreteString(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  return createValueInterpolator<DiscreteStringInterpolator>(rt, value);
}

InterpolatorFactoryFunction InterpolatorFactory::relativeOrNumeric(
    TargetType relativeTo,
    const std::string &relativeProperty) {
  return [relativeTo, relativeProperty](
             jsi::Runtime &rt, const jsi::Value &value) {
    auto interpolator = std::make_shared<RelativeOrNumericValueInterpolator>(
        relativeTo, relativeProperty);
    interpolator->initialize(rt, value);
    return interpolator;
  };
}

template <typename T>
std::shared_ptr<Interpolator> InterpolatorFactory::createValueInterpolator(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  auto interpolator = std::make_shared<T>();
  interpolator->initialize(rt, value);
  return interpolator;
}

} // namespace reanimated
