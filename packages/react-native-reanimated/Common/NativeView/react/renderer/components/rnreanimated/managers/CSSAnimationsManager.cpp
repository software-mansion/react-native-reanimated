#include <react/renderer/components/rnreanimated/managers/CSSAnimationsManager.h>

namespace facebook::react {

CSSAnimationsManager::CSSAnimationsManager(
    std::shared_ptr<CSSKeyframesRegistry> cssAnimationKeyframesRegistry,
    std::shared_ptr<ViewStylesRepository> viewStylesRepository)
    : cssAnimationKeyframesRegistry_(std::move(cssAnimationKeyframesRegistry)),
      viewStylesRepository_(std::move(viewStylesRepository)) {}

void CSSAnimationsManager::onPropsChange(
    const double timestamp,
    const ReanimatedNodeProps &oldProps,
    const ReanimatedNodeProps &newProps) {
  if (&oldProps.cssAnimations == &newProps.cssAnimations) {
    return;
  }

  // Map current animations to their names in order to reuse the same instances
  // for animations with the same names
  auto nameToAnimationsMap = createCurrentNameToAnimationsMap();
  // Build a vector with new animations
  animations_ = createAndStartNewAnimations(
      timestamp, std::move(nameToAnimationsMap), newProps.cssAnimations);
}

folly::dynamic CSSAnimationsManager::onFrame(
    const double timestamp,
    const ShadowNode::Shared &shadowNode) {
  auto result = folly::dynamic();

  for (const auto &animation : animations_) {
    animation->update(timestamp);
    const auto animationProps =
        animation->getCurrentFrameProps(shadowNode, viewStylesRepository_);
    if (!animationProps.empty()) {
      result.update(animationProps);
    }
  }

  return result;
}

CSSAnimationsManager::NameToAnimationsMap
CSSAnimationsManager::createCurrentNameToAnimationsMap() const {
  NameToAnimationsMap nameToAnimationsMap;

  for (const auto &animation : animations_) {
    nameToAnimationsMap[animation->getName()].emplace_back(animation);
  }

  return nameToAnimationsMap;
}

CSSAnimationsManager::AnimationsVector
CSSAnimationsManager::createAndStartNewAnimations(
    const double timestamp,
    NameToAnimationsMap nameToAnimationsMap,
    const std::vector<CSSAnimationConfig> &animationConfigs) {
  AnimationsVector result;
  result.reserve(animationConfigs.size());

  for (const auto &animationConfig : animationConfigs) {
    const auto &animationName = animationConfig.name;
    const auto it = nameToAnimationsMap.find(animationName);

    if (it == nameToAnimationsMap.end()) {
      // Create a new animation the animation with the same name doesn't exist
      const auto animation = std::make_shared<CSSAnimation>(
          animationConfig, cssAnimationKeyframesRegistry_, timestamp);
      if (animation->getState() == AnimationProgressState::Pending) {
        animation->run(timestamp);
      }
      result.emplace_back(std::move(animation));
    } else {
      // Update the animation with the settings from the new config
      auto &animations = it->second;
      const auto animation = std::move(animations.back());
      animations.pop_back();

      animation->updateSettings(animationConfig, timestamp);
      result.emplace_back(std::move(animation));

      if (animations.empty()) {
        nameToAnimationsMap.erase(it);
      }
    }
  }

  return result;
}

// void CSSAnimationsManager::updateAnimationOperation(
//     const std::shared_ptr<CSSAnimation> &animation) {
//   // Remove the operation if it exists
//   removeAnimationOperation(animation);

//   const auto state = animation->getState();
//   if (state == AnimationProgressState::Finished ||
//       state == AnimationProgressState::Paused) {
//     return;
//   }

//   // Schedule a new operation to update the animation on every frame
//   operationHandles_[animation->getName()] = operationsLoop_->schedule(
//       Operation()
//           .doOnce([animation](double timestamp) {

//           })
//           .waitFor([animation](double timestamp) {
//             const auto startTimestamp =
//             animation->getStartTimestamp(timestamp); if (startTimestamp >
//             timestamp &&
//                 animation->getState() != AnimationProgressState::Paused) {
//               return startTimestamp - timestamp;
//             }
//             return 0.0;
//           })
//           .doWhile([animation](double timestamp) {
//             animation->update(timestamp);
//             return animation->getState() == AnimationProgressState::Running;
//           })
//           .build());
// }

} // namespace facebook::react
