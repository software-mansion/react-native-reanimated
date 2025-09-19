#include <reanimated/CSS/configs/interpolators/registry.h>

#include <reanimated/CSS/configs/interpolators/base/image.h>
#include <reanimated/CSS/configs/interpolators/base/text.h>
#include <reanimated/CSS/configs/interpolators/base/view.h>

namespace reanimated::css {

namespace {

ComponentInterpolatorsMap registry = {
    {"View", getViewInterpolators()},
    {"Paragraph", getTextInterpolators()},
    {"Image", getImageInterpolators()},
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
    return getViewInterpolators();
  }

  return it->second;
}

void registerComponentInterpolators(
    const std::string &componentName,
    const InterpolatorFactoriesRecord &interpolators) {
  registry[componentName] = interpolators;
}

} // namespace reanimated::css
