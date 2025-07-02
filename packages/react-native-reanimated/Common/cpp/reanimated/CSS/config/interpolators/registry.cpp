#include <reanimated/CSS/config/interpolators/registry.h>

namespace reanimated::css {

namespace {

ComponentInterpolatorsMap registry_ = {{"View", VIEW_INTERPOLATORS}};

} // namespace

void registerInterpolators(
    const std::string &componentName,
    InterpolatorFactoriesRecord factories) {
  auto [it, inserted] = registry_.emplace(componentName, std::move(factories));

  // If interpolators for the component are already registered, throw an error
  if (!inserted) {
    throw std::logic_error(
        "[Reanimated] Interpolators already registered for component '" +
        componentName + "'");
  }
}

const InterpolatorFactoriesRecord &getInterpolators(
    const std::string &componentName) {
  const auto it = registry_.find(std::string(componentName));

  if (it == registry_.end()) {
    throw std::logic_error(
        "[Reanimated] No interpolators registered for component '" +
        std::string(componentName) + "'");
  }

  return it->second;
}

} // namespace reanimated::css
