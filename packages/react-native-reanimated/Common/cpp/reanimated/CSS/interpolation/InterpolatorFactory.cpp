#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

namespace reanimated {

InterpolatorFactoryFunction InterpolatorFactory::object(
    const ObjectPropertiesInterpolatorFactories &factories) {
  return [factories](jsi::Runtime &rt, const jsi::Value &value) {
    auto properties = value.asObject(rt).getPropertyNames(rt);
    return std::make_shared<ObjectPropertiesInterpolator>(
        rt, properties, factories);
  };
}

InterpolatorFactoryFunction InterpolatorFactory::transform(
    const TransformPropertyInterpolatorFactories &factories) {
  return [factories](
             jsi::Runtime &rt,
             const jsi::Value &value) -> std::shared_ptr<Interpolator> {
    auto transformsArray = value.asObject(rt).asArray(rt);
    return std::make_shared<TransformsStyleInterpolator>(
        rt, transformsArray, factories);
  };
}

std::shared_ptr<Interpolator> InterpolatorFactory::numeric(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  auto interpolator = std::make_shared<NumericValueInterpolator>();
  interpolator->initialize(rt, value);
  return interpolator;
}

} // namespace reanimated
