#include <reanimated/CSS/utils/interpolators.h>

#include <memory>
#include <string>

namespace reanimated::css {

std::shared_ptr<PropertyInterpolator> createPropertyInterpolator(
    const std::string &propertyName,
    const std::vector<std::string> &propertyPath,
    const InterpolatorFactoriesRecord &factories,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) {
  auto it = factories.find(propertyName);

  if (it == factories.cend()) {
    throw std::invalid_argument("[Reanimated] No interpolator factory found for property: " + propertyName);
  }

  std::vector<std::string> newPath = propertyPath;
  newPath.emplace_back(propertyName);

  return it->second->create(newPath, viewStylesRepository);
}

std::shared_ptr<PropertyInterpolator> createPropertyInterpolator(
    size_t arrayIndex,
    const std::vector<std::string> &propertyPath,
    const InterpolatorFactoriesArray &factories,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) {
  std::vector<std::string> newPath = propertyPath;
  newPath.emplace_back(std::to_string(arrayIndex));

  return factories[arrayIndex % factories.size()]->create(newPath, viewStylesRepository);
}

} // namespace reanimated::css
