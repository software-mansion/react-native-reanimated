#include <reanimated/CSS/core/CSSAnimationsGroup.h>

#include <utility>

namespace reanimated::css {

CSSAnimationsGroup::CSSAnimationsGroup(std::shared_ptr<const ShadowNode> shadowNode, CSSAnimationsVector animations)
    : shadowNode_(std::move(shadowNode)), animations_(std::move(animations)) {}

const CSSAnimationsVector &CSSAnimationsGroup::getAnimations() const {
  return animations_;
}

ShadowNodeFamily::Shared CSSAnimationsGroup::getShadowNodeFamily() const {
  return shadowNode_->getFamilyShared();
}

void CSSAnimationsGroup::updateSettings(const CSSAnimationSettingsUpdatesMap &settingsUpdates, const double timestamp) {
  for (size_t i = 0; i < animations_.size(); ++i) {
    const auto it = settingsUpdates.find(i);
    if (it != settingsUpdates.end()) {
      animations_[i]->updateSettings(it->second, timestamp);
    }
  }
}

void CSSAnimationsGroup::schedule(OperationsLoop &loop) {
  for (const auto &animation : animations_) {
    animation->schedule(loop);
  }
}

void CSSAnimationsGroup::unschedule(OperationsLoop &loop) const {
  for (const auto &animation : animations_) {
    animation->unschedule(loop);
  }
}

folly::dynamic CSSAnimationsGroup::computeStyle(bool includeResetStyles) const {
  folly::dynamic style = folly::dynamic::object;

  for (const auto &animation : animations_) {
    const auto state = animation->getState();

    if (state == AnimationProgressState::Running || state == AnimationProgressState::Paused ||
        (state == AnimationProgressState::Finished && animation->hasForwardsFillMode())) {
      style.update(animation->getCurrentInterpolationStyle(shadowNode_));
    } else if (state == AnimationProgressState::Pending && animation->hasBackwardsFillMode()) {
      style.update(animation->getBackwardsFillStyle());
    } else if (state == AnimationProgressState::Finished && includeResetStyles) {
      const auto resetStyle = animation->getResetStyle(shadowNode_);
      for (const auto &[key, value] : resetStyle.items()) {
        if (!style.count(key)) {
          style[key] = value;
        }
      }
    }
  }

  return style;
}

} // namespace reanimated::css
