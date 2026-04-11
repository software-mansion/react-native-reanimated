#include <reanimated/CSS/registries/CSSAnimationsRegistry.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated::css {

CSSAnimationsRegistry::CSSAnimationsRegistry(
    const std::shared_ptr<OperationsLoop> &loop,
    const std::shared_ptr<CSSKeyframesRegistry> &keyframesRegistry)
    : loop_(loop), keyframesRegistry_(keyframesRegistry) {}

bool CSSAnimationsRegistry::needsFlush() const {
  return !updatedTags_.empty();
}

void CSSAnimationsRegistry::apply(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::string &compoundComponentName,
    const CSSAnimationUpdates &updates) {
  const auto viewTag = shadowNode->getTag();
  auto newGroup =
      maybeBuildNewGroup(shadowNode, compoundComponentName, updates.animationNames, updates.newAnimationSettings);

  if (newGroup) {
    auto oldIt = groups_.find(viewTag);
    if (oldIt != groups_.end()) {
      oldIt->second.unschedule(loop_);
    }

    if (newGroup->getAnimations().empty()) {
      remove(viewTag);
      return;
    }

    groups_.insert_or_assign(viewTag, std::move(*newGroup));
  }

  auto it = groups_.find(viewTag);
  if (it == groups_.end()) {
    return;
  }

  auto &group = it->second;
  group.updateSettings(updates.settingsUpdates, loop_->getTimestamp());
  group.schedule(loop_);

  const auto style = group.computeStyle();
  // Set current style to updates registry to ensure that all old
  // styles are removed (replaced by the new style)
  setInUpdatesRegistry(group.getShadowNodeFamily(), style);
  // Mark always as updated to ensure that updates are committed
  updatedTags_.insert(viewTag);
}

void CSSAnimationsRegistry::remove(const Tag viewTag) {
  auto it = groups_.find(viewTag);
  if (it != groups_.end()) {
    it->second.unschedule(loop_);
    groups_.erase(it);
  }
  removeFromUpdatesRegistry(viewTag);
  updatedTags_.erase(viewTag);
}

void CSSAnimationsRegistry::flushUpdates(UpdatesBatch &updatesBatch) {
  for (const auto viewTag : updatedTags_) {
    const auto it = groups_.find(viewTag);
    if (it == groups_.end()) {
      continue;
    }

    const auto updates = it->second.computeStyle(true);
    if (!updates.empty()) {
      addUpdatesToBatch(it->second.getShadowNodeFamily(), updates);
    }
  }

  updatedTags_.clear();
  UpdatesRegistry::flushUpdates(updatesBatch);
  updateRegistryForRevertedAnimations();
}

std::optional<CSSAnimationGroup> CSSAnimationsRegistry::maybeBuildNewGroup(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::string &compoundComponentName,
    const std::optional<std::vector<std::string>> &updatedAnimationNames,
    const CSSAnimationSettingsMap &newAnimationSettings) {
  // No animations added/removed/reordered — nothing to build
  if (!updatedAnimationNames.has_value()) {
    return std::nullopt;
  }

  const auto viewTag = shadowNode->getTag();
  const auto groupIt = groups_.find(viewTag);

  const auto &names = updatedAnimationNames.value();
  const auto timestamp = loop_->getTimestamp();

  // Index old animations by name (reversed for quick pop)
  std::unordered_map<std::string, CSSAnimationsVector> oldByName;
  if (groupIt != groups_.end()) {
    for (auto it = groupIt->second.getAnimations().rbegin(); it != groupIt->second.getAnimations().rend(); ++it) {
      oldByName[(*it)->getName()].emplace_back(*it);
    }
  }

  // Build new vector — create new or reuse old
  CSSAnimationsVector animations;
  animations.reserve(names.size());

  for (size_t i = 0; i < names.size(); ++i) {
    const auto &name = names[i];
    const auto settingsIt = newAnimationSettings.find(i);

    if (settingsIt != newAnimationSettings.end()) {
      animations.emplace_back(createAnimation(shadowNode, name, compoundComponentName, settingsIt->second, timestamp));
    } else {
      auto oldIt = oldByName.find(name);
      if (oldIt == oldByName.end()) {
        throw std::runtime_error(
            "[Reanimated] There is no animation with name " + name + " available to use at index " + std::to_string(i));
      }
      animations.emplace_back(oldIt->second.back());
      oldIt->second.pop_back();
      if (oldIt->second.empty()) {
        oldByName.erase(oldIt);
      }
    }
  }

  return CSSAnimationGroup(shadowNode, std::move(animations));
}

std::shared_ptr<CSSAnimation> CSSAnimationsRegistry::createAnimation(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::string &name,
    const std::string &compoundComponentName,
    const CSSAnimationSettings &settings,
    const double timestamp) {
  const auto keyframesConfig = keyframesRegistry_->get(name, compoundComponentName);
  if (!keyframesConfig) {
    throw std::runtime_error(
        "[Reanimated] No keyframes with name `" + name + "` were registered for component `" +
        splitCompoundComponentName(compoundComponentName).second + "` (" + shadowNode->getComponentName() + ")");
  }

  const auto viewTag = shadowNode->getTag();

  auto animation = std::make_shared<CSSAnimation>(name, keyframesConfig->get(), settings, timestamp);
  animation->setOnUpdateCallback([this, viewTag, weakAnimation = std::weak_ptr<CSSAnimation>(animation)]() {
    if (auto animation = weakAnimation.lock()) {
      onAnimationUpdate(viewTag, animation);
    }
  });
  return animation;
}

void CSSAnimationsRegistry::onAnimationUpdate(const Tag viewTag, const std::shared_ptr<CSSAnimation> &animation) {
  updatedTags_.insert(viewTag);

  const auto state = animation->getState();
  if (state == AnimationProgressState::Pending) {
    loop_->schedule(animation, animation->getRemainingDelay(loop_->getTimestamp()));
  } else if (state == AnimationProgressState::Finished && !animation->hasForwardsFillMode()) {
    revertedTags_.insert(viewTag);
  }
}

void CSSAnimationsRegistry::updateRegistryForRevertedAnimations() {
  for (const auto viewTag : revertedTags_) {
    const auto it = groups_.find(viewTag);
    if (it != groups_.end()) {
      setInUpdatesRegistry(it->second.getShadowNodeFamily(), it->second.computeStyle());
    }
  }
  revertedTags_.clear();
}

} // namespace reanimated::css
