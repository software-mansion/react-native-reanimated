#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>

namespace reanimated::css {

AnimationStyleInterpolator::AnimationStyleInterpolator(
    const std::string &nativeComponentName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const std::shared_ptr<const PropertyInterpolatorsRecord> &allInterpolators)
    : RecordPropertiesInterpolator(getComponentInterpolators(nativeComponentName), {}, viewStylesRepository),
      allInterpolators_(allInterpolators) {}

void AnimationStyleInterpolator::setActiveProperties(const std::unordered_set<std::string> &propertyNames) {
  interpolators_.clear();

  for (const auto &propertyName : propertyNames) {
    const auto it = allInterpolators_->find(propertyName);
    if (it != allInterpolators_->end()) {
      interpolators_[propertyName] = it->second;
    }
  }
}

} // namespace reanimated::css
