#include <reanimated/CSS/registries/CSSAnimationsRegistry.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>

#include <react/debug/react_native_assert.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated::css {

CSSAnimationsRegistry::CSSAnimationsRegistry(
    const std::shared_ptr<OperationsLoop> &loop,
    const std::shared_ptr<CSSKeyframesRegistry> &keyframesRegistry,
    const std::shared_ptr<CSSPlatformAnimationFactory> &platformAnimationFactory)
    : loop_(loop), keyframesRegistry_(keyframesRegistry), platformAnimationFactory_(platformAnimationFactory) {}

bool CSSAnimationsRegistry::needsFlush() const {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  return !updatedTags_.empty();
}

void CSSAnimationsRegistry::apply(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::string &compoundComponentName,
    const CSSAnimationUpdates &updates) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  const auto viewTag = shadowNode->getTag();
  auto newGroup =
      maybeBuildNewGroup(shadowNode, compoundComponentName, updates.animationNames, updates.newAnimationSettings);

  if (newGroup) {
    auto oldIt = groups_.find(viewTag);
    if (oldIt != groups_.end()) {
      oldIt->second.unschedule(*loop_);
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
  group.updateSettings(updates.settingsUpdates, loop_->resolveTimestamp());
  group.schedule(*loop_);

  // Set current style to updates registry to ensure that all old
  // styles are removed (replaced by the new style).
  setInUpdatesRegistry(group.getShadowNodeFamily(), group.computeStyle());
  // Mark always as updated to ensure that updates are committed
  updatedTags_.insert(viewTag);
}

void CSSAnimationsRegistry::flushUpdates(UpdatesBatch &updatesBatch) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  const auto tags = std::exchange(updatedTags_, {});
  for (const auto viewTag : tags) {
    const auto it = groups_.find(viewTag);
    if (it == groups_.end()) {
      continue;
    }

    const auto updates = it->second.computeStyle(true);
    if (!updates.empty()) {
      addUpdatesToBatch(it->second.getShadowNodeFamily(), updates);
    }
  }

  flush(updatesBatch);
  updateRegistryForRevertedAnimations();
}

#if REACT_NATIVE_VERSION_MINOR >= 85
void CSSAnimationsRegistry::flushUpdates(UpdatesBatchAnimatedProps &updatesBatch) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  const auto tags = std::exchange(updatedTags_, {});
  for (const auto viewTag : tags) {
    const auto it = groups_.find(viewTag);
    if (it == groups_.end()) {
      continue;
    }

    const auto updates = it->second.computeStyle(true);
    if (!updates.empty()) {
      addRawPropsToAnimatedPropsBatch(it->second.getShadowNodeFamily(), updates);
      // Legacy flushes merge each frame into the updates registry; animated-props flushes do not.
      // Keep the registry current so subsequent reads see the latest values.
      setInUpdatesRegistry(it->second.getShadowNodeFamily(), updates);
    }
  }

  flush(updatesBatch);
  updateRegistryForRevertedAnimations();
}
#endif

CSSAnimationsRegistry::AnimationObserver::AnimationObserver(CSSAnimationsRegistry &owner) : owner_(owner) {}

void CSSAnimationsRegistry::AnimationObserver::onAnimationUpdate(const Tag viewTag) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  owner_.updatedTags_.insert(viewTag);
}

void CSSAnimationsRegistry::AnimationObserver::onAnimationNeedsRevert(const Tag viewTag) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  owner_.pendingRevertTags_.insert(viewTag);
}

void CSSAnimationsRegistry::removeTag(const Tag viewTag) {
  auto it = groups_.find(viewTag);
  if (it != groups_.end()) {
    it->second.unschedule(*loop_);
    groups_.erase(it);
  }
  removeFromUpdatesRegistry(viewTag);
}

std::optional<CSSAnimationsGroup> CSSAnimationsRegistry::maybeBuildNewGroup(
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
  const auto timestamp = loop_->resolveTimestamp();

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

  return CSSAnimationsGroup(shadowNode, std::move(animations));
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

  return std::make_shared<CSSAnimation>(
      shadowNode->getTag(),
      name,
      keyframesConfig->get(),
      settings,
      animationObserver_,
      platformAnimationFactory_,
      timestamp);
}

void CSSAnimationsRegistry::updateRegistryForRevertedAnimations() {
  const auto tags = std::exchange(pendingRevertTags_, {});
  for (const auto viewTag : tags) {
    const auto it = groups_.find(viewTag);
    if (it != groups_.end()) {
      setInUpdatesRegistry(it->second.getShadowNodeFamily(), it->second.computeStyle());
    }
  }
}

} // namespace reanimated::css
