#include <reanimated/CSS/interpolation/styles/AnimationStyleInterpolator.h>

namespace reanimated::css {

AnimationStyleInterpolator::AnimationStyleInterpolator(
    const std::string &nativeComponentName,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const std::shared_ptr<const PropertyInterpolatorsRecord> &allInterpolators)
    : RecordPropertiesInterpolator(getComponentInterpolators(nativeComponentName), {}, viewStylesRepository),
      allInterpolators_(allInterpolators) {}

void AnimationStyleInterpolator::activateProperty(const std::string &propertyName) {
  if (!allInterpolators_) {
    return;
  }
  const auto it = allInterpolators_->find(propertyName);
  if (it != allInterpolators_->end()) {
    setInterpolator(propertyName, it->second);
  }
}

void AnimationStyleInterpolator::activateProperties(const std::unordered_set<std::string> &propertyNames) {
  for (const auto &propertyName : propertyNames) {
    activateProperty(propertyName);
  }
}

} // namespace reanimated::css
