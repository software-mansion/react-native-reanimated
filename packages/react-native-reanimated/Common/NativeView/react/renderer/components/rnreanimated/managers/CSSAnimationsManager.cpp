#include <react/renderer/components/rnreanimated/managers/CSSAnimationsManager.h>

namespace facebook::react {

CSSAnimationsManager::CSSAnimationsManager(
    std::shared_ptr<OperationsLoop> operationsLoop,
    std::shared_ptr<ViewStylesRepository> viewStylesRepository)
    : operationsLoop_(std::move(operationsLoop)),
      viewStylesRepository_(std::move(viewStylesRepository)) {}

CSSAnimationsManager::~CSSAnimationsManager() {
  for (const auto &animation : animations_) {
    removeAnimationOperation(animation);
  }
}

folly::dynamic CSSAnimationsManager::getCurrentFrameProps(
    const ShadowNode::Shared &shadowNode) {
  auto result = folly::dynamic();

  for (const auto &animation : animations_) {
    const auto animationProps =
        animation->getCurrentFrameProps(shadowNode, viewStylesRepository_);
    if (!animationProps.empty()) {
      result.update(animationProps);
    }
  }

  return result;
}

void CSSAnimationsManager::update(
    const ReanimatedNodeProps &oldProps,
    const ReanimatedNodeProps &newProps) {
  if (oldProps.cssAnimations == newProps.cssAnimations) {
    return;
  }

  // Map current animations to their tags in order to reuse the same instances
  // for animations with the same tags
  auto tagToAnimationsMap = createCurrentTagToAnimationsMap();
  // Build a vector with new animations
  animations_ =
      createAndStartNewAnimations(tagToAnimationsMap, newProps.cssAnimations);
  // Remove all remaining animations in the map
  for (const auto &[_, animations] : tagToAnimationsMap) {
    for (const auto &animation : animations) {
      removeAnimationOperation(animation);
    }
  }
}

CSSAnimationsManager::TagToAnimationsMap
CSSAnimationsManager::createCurrentTagToAnimationsMap() const {
  TagToAnimationsMap tagToAnimationsMap;

  for (const auto &animation : animations_) {
    tagToAnimationsMap[animation->getTag()].emplace_back(animation);
  }

  return tagToAnimationsMap;
}

CSSAnimationsManager::AnimationsVector
CSSAnimationsManager::createAndStartNewAnimations(
    TagToAnimationsMap &tagToAnimationsMap,
    const std::vector<CSSAnimationConfig> &animationConfigs) {
  AnimationsVector result;
  result.reserve(animationConfigs.size());

  const auto timestamp = operationsLoop_->getFrameTimestamp();

  for (const auto &animationConfig : animationConfigs) {
    const auto &animationTag = animationConfig.tag;
    const auto it = tagToAnimationsMap.find(animationTag);

    if (it == tagToAnimationsMap.end()) {
      // Create a new animation the animation with the same tag doesn't exist
      const auto animation = createAnimation(animationConfig, timestamp);
      updateAnimationOperation(animation);
      result.emplace_back(std::move(animation));
    } else {
      // Update the animation with the settings from the new config
      auto &animations = it->second;
      const auto animation = std::move(animations.back());
      animations.pop_back();

      const auto stateChanged =
          animation->updateSettings(animationConfig, timestamp);
      if (stateChanged) {
        updateAnimationOperation(animation);
      }
      result.emplace_back(std::move(animation));

      if (animations.empty()) {
        tagToAnimationsMap.erase(it);
      }
    }
  }

  return result;
}

std::shared_ptr<CSSAnimation> CSSAnimationsManager::createAnimation(
    const CSSAnimationConfig &animationConfig,
    const double timestamp) {
  return std::make_shared<CSSAnimation>(animationConfig, timestamp);
}

void CSSAnimationsManager::removeAnimationOperation(
    const std::shared_ptr<CSSAnimation> &animation) {
  const auto it = operationHandles_.find(animation->getTag());
  if (it != operationHandles_.end()) {
    operationsLoop_->remove(it->second);
    operationHandles_.erase(it);
  }
}

void CSSAnimationsManager::updateAnimationOperation(
    const std::shared_ptr<CSSAnimation> &animation) {
  // Remove the operation if it exists
  removeAnimationOperation(animation);

  const auto state = animation->getState();
  if (state == AnimationProgressState::Finished ||
      state == AnimationProgressState::Paused) {
    return;
  }

  // Schedule a new operation to update the animation on every frame
  operationHandles_[animation->getTag()] = operationsLoop_->schedule(
      Operation()
          .doOnce([animation](double timestamp) {
            if (animation->getState() == AnimationProgressState::Pending) {
              animation->run(timestamp);
            }
          })
          .waitFor([animation](double timestamp) {
            const auto startTimestamp = animation->getStartTimestamp(timestamp);
            if (startTimestamp > timestamp &&
                animation->getState() != AnimationProgressState::Paused) {
              return startTimestamp - timestamp;
            }
            return 0.0;
          })
          .doWhile([animation](double timestamp) {
            animation->update(timestamp);
            return animation->getState() == AnimationProgressState::Running;
          })
          .build());
}

} // namespace facebook::react
