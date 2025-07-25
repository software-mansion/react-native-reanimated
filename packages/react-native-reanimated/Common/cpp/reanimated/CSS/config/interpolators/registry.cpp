#include <reanimated/CSS/config/interpolators/registry.h>
#include <reanimated/Tools/FeatureFlags.h>

namespace reanimated::css {

namespace {

ComponentInterpolatorsMap registry_ = [] {
  ComponentInterpolatorsMap result = {
      {"View", VIEW_INTERPOLATORS},
      {"Paragraph", TEXT_INTERPOLATORS},
      {"Image", IMAGE_INTERPOLATORS},
  };
  if constexpr (StaticFeatureFlags::getFlag("UNFINISHED_SVG_CSS_SUPPORT")) {
    result["RNSVGCircle"] = SVG_CIRCLE_INTERPOLATORS;
  }
  return result;
}();

} // namespace

bool hasInterpolators(const std::string &componentName) {
  return registry_.contains(componentName);
}

const InterpolatorFactoriesRecord &getInterpolators(
    const std::string &componentName) {
  const auto it = registry_.find(componentName);

  if (it == registry_.end()) {
    // Use View interpolators as a fallback for unknown components
    // (e.g. we get the ScrollView component name for the ScrollView component
    // but it should be styled in the same way as a View)
    return VIEW_INTERPOLATORS;
  }

  return it->second;
}

} // namespace reanimated::css
