#include <reanimated/CSS/registry/AnimationsRegistry.h>

namespace reanimated::css {

AnimationsVector &AnimationsRegistry::operator[](Tag viewTag) const {
  return registry_[viewTag];
}

bool AnimationsRegistry::has(const Tag viewTag) const {
  return registry_.find(viewTag) != registry_.end();
}

AnimationsVector &AnimationsRegistry::at(const Tag viewTag) const {
  return registry_.at(viewTag);
}

std::shared_ptr<CSSAnimation> &AnimationsRegistry::at(
    const Tag viewTag,
    const size_t index) const {
  return registry_.at(viewTag).at(index);
}

void AnimationsRegistry::set(const Tag viewTag, AnimationsVector &&animations) {
  std::lock_guard<std::mutex> lock{mutex_};

  registry_[viewTag] = std::move(animations);
  applyViewAnimationsStyle(viewTag, timestamp); // TODO - fix
}

void AnimationsRegistry::remove(const Tag viewTag) {
  std::lock_guard<std::mutex> lock{mutex_};

  handleRemove(viewTag);
}

void AnimationsRegistry::removeBatch(const std::vector<Tag> &tagsToRemove) {
  std::lock_guard<std::mutex> lock{mutex_};

  for (const auto &viewTag : tagsToRemove) {
    handleRemove(viewTag);
  }
}

void AnimationsRegistry::applyViewAnimationsStyle(
    const Tag viewTag,
    const double timestamp) {
  // TODO - fix
  const auto it = registry_.find(viewTag);
  // Remove the style from the registry if there are no animations for the
  // view
  if (it == registry_.end() || it->second.empty()) {
    removeFromUpdatesRegistry(viewTag);
    return;
  }

  folly::dynamic updatedStyle = folly::dynamic::object;
  ShadowNode::Shared shadowNode = nullptr;

  for (const auto &animation : it->second) {
    const auto &progressProvider = animationProgressProvidersMap_[animation];
    const auto startTimestamp = progressProvider->getStartTimestamp(timestamp);

    folly::dynamic style;
    const auto &currentState = progressProvider->getState(timestamp);
    if (currentState == AnimationProgressState::Finished) {
      if (animation->hasForwardsFillMode()) {
        style = animation->getForwardsFillStyle();
      }
    } else if (
        startTimestamp == timestamp ||
        (startTimestamp > timestamp && animation->hasBackwardsFillMode())) {
      style = animation->getBackwardsFillStyle();
    } else if (currentState != AnimationProgressState::Pending) {
      style = animation->getCurrentFrame();
    }

    if (!shadowNode) {
      shadowNode = animation->getShadowNode();
    }
    if (style.isObject()) {
      updatedStyle.update(style);
    }
  }

  setInUpdatesRegistry(shadowNode, updatedStyle);
}

void AnimationsRegistry::handleRemove(const Tag viewTag) {
  removeFromUpdatesRegistry(viewTag);
  registry_.erase(viewTag);
}

} // namespace reanimated::css
