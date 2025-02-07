#if RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>

namespace reanimated {

PropertyInterpolator::PropertyInterpolator(
    const PropertyPath &propertyPath,
    const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : propertyPath_(propertyPath),
      viewStylesRepository_(viewStylesRepository),
      progressProvider_(progressProvider) {}

void PropertyInterpolator::setProgressProvider(
    const std::shared_ptr<KeyframeProgressProvider> &progressProvider) {
  progressProvider_ = progressProvider;
}

bool PropertyInterpolatorFactory::isDiscreteProperty() const {
  return false;
}

} // namespace reanimated

#endif
