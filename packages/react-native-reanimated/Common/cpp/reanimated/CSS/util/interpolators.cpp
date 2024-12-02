#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/util/interpolators.h>

namespace reanimated {

std::shared_ptr<PropertyInterpolator> createPropertyInterpolator(
    const std::string &propertyName,
    const std::vector<std::string> &propertyPath,
    const PropertyInterpolatorFactories &factories,
    const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) {
  auto factoryIt = factories.find(propertyName);

  if (factoryIt == factories.cend()) {
    throw std::invalid_argument(
        "[Reanimated] No interpolator factory found for property: " +
        propertyName);
  }

  PropertyPath newPath = propertyPath;
  newPath.emplace_back(propertyName);

  return factoryIt->second->create(
      newPath, progressProvider, viewStylesRepository);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
