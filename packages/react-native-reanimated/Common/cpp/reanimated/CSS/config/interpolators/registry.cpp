#include <reanimated/CSS/config/interpolators/registry.h>

namespace reanimated::css {

namespace {

ComponentInterpolatorsMap registry_; // Keep the map private

} // namespace

void registerInterpolators(
    std::string_view componentName,
    InterpolatorFactoriesRecord factories) {
  auto [it, inserted] =
      registry_.emplace(std::string(componentName), std::move(factories));

  // If interpolators for the component are already registered, throw an error
  if (!inserted) {
    throw std::logic_error(
        "[Reanimated] Interpolators already registered for component '" +
        std::string(componentName) + "'");
  }
}

const InterpolatorFactoriesRecord &getInterpolators(
    std::string_view componentName) {
  const auto it = registry_.find(std::string(componentName));

  if (it == registry_.end()) {
    throw std::logic_error(
        "[Reanimated] No interpolators registered for component '" +
        std::string(componentName) + "'");
  }

  return it->second;
}

bool hasInterpolators(const std::string &componentName) {
  return registry_.find(componentName) != registry_.end();
}

} // namespace reanimated::css
