#include <reanimated/CSS/configs/interpolators/registry.h>

namespace reanimated::css {

namespace {

ComponentInterpolatorsMap registry = {
    {"View", VIEW_INTERPOLATORS},
    {"Paragraph", TEXT_INTERPOLATORS},
    {"Image", IMAGE_INTERPOLATORS},
};

} // namespace

bool hasInterpolators(const std::string &componentName) {
  return registry.contains(componentName);
}

const InterpolatorFactoriesRecord &getComponentInterpolators(
    const std::string &componentName) {
  const auto it = registry.find(componentName);

  if (it == registry.end()) {
    // Use View interpolators as a fallback for unknown components
    // (e.g. we get the ScrollView component name for the ScrollView component
    // but it should be styled in the same way as a View)
    return VIEW_INTERPOLATORS;
  }

  return it->second;
}

void registerComponentInterpolators(
    const std::string &componentName,
    const InterpolatorFactoriesRecord &interpolators) {
  registry[componentName] = interpolators;
}

} // namespace reanimated::css
