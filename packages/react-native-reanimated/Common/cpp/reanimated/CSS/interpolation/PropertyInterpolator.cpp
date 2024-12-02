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

PropertyInterpolatorFactory::PropertyInterpolatorFactory(PropertyType type)
    : type_(type) {}

PropertyType PropertyInterpolatorFactory::getType() const {
  return type_;
}

template <typename T>
std::shared_ptr<PropertyInterpolatorFactory>
PropertyInterpolatorFactory::create(PropertyType type) {
  return std::make_shared<PropertyInterpolatorFactory>(type);
}

} // namespace reanimated

#endif
