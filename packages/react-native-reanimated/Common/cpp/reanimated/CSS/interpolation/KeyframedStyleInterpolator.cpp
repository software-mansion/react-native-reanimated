#include <reanimated/CSS/interpolation/KeyframedStyleInterpolator.h>

namespace reanimated {

KeyframedStyleInterpolator::KeyframedStyleInterpolator(
    jsi::Runtime &rt,
    const jsi::Object &keyframedStyle)
    : ObjectPropertiesInterpolator(rt, keyframedStyle, getFactories()) {}

jsi::Value KeyframedStyleInterpolator::update(
    jsi::Runtime &rt,
    double progress) {
  return ObjectPropertiesInterpolator::update(rt, progress);
}

const ObjectPropertiesInterpolatorFactories &
KeyframedStyleInterpolator::getFactories() {
  static const ObjectPropertiesInterpolatorFactories factories = {
      {"width", InterpolatorFactory::numeric},
      {"height", InterpolatorFactory::numeric},
      {"opacity", InterpolatorFactory::numeric},
      {"transform",
       InterpolatorFactory::transform({
           {"translateX", InterpolatorFactory::numeric},
           {"translateY", InterpolatorFactory::numeric},
           {"scale", InterpolatorFactory::numeric},
       })},
      // Add more interpolator factories here as needed
  };
  return factories;
}

} // namespace reanimated
