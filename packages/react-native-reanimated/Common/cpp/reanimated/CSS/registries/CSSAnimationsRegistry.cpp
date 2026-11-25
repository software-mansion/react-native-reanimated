#include <reanimated/CSS/registries/CSSAnimationsRegistry.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>

#include <reanimated/Compat/ReactNativeDebug.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>

namespace reanimated::css {

namespace {

void reportCancellations(const CSSAnimationsVector &animations, const double timestamp) {
  for (const auto &animation : animations) {
    animation->reportCancellation(timestamp);
  }
}

} // namespace

CSSAnimationsRegistry::CSSAnimationsRegistry(
    const std::shared_ptr<OperationsLoop> &loop,
    const std::shared_ptr<CSSKeyframesRegistry> &keyframesRegistry,
    const std::shared_ptr<CSSPlatformAnimationFactory> &platformAnimationFactory,
    const std::shared_ptr<CSSEventsEmitter> &eventsEmitter,
    const std::shared_ptr<MountedRootsRegistry> &mountedRootsRegistry)
    : loop_(loop),
      keyframesRegistry_(keyframesRegistry),
      platformAnimationFactory_(platformAnimationFactory),
      eventsEmitter_(eventsEmitter),
      mountedRootsRegistry_(mountedRootsRegistry) {}

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

    const auto &group = groups_.insert_or_assign(viewTag, std::move(*newGroup)).first->second;
    updateVisibility(viewTag, group);
  }

  auto it = groups_.find(viewTag);
  if (it == groups_.end()) {
    return;
  }

  auto &group = it->second;
  group.setEventMask(updates.eventMask);
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
    if (it == groups_.end() || shouldDeferUpdates(viewTag, it->second)) {
      continue;
    }

    auto updates = it->second.computeStyle(true);
    if (!updates.empty()) {
      addUpdatesToBatch(it->second.getShadowNodeFamily(), std::move(updates));
    }
  }

  flush(updatesBatch);
  updateRegistryForRevertedAnimations();
}

void CSSAnimationsRegistry::flushUpdates(UpdatesBatchAnimatedProps &updatesBatch) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  const auto tags = std::exchange(updatedTags_, {});
  for (const auto viewTag : tags) {
    const auto it = groups_.find(viewTag);
    if (it == groups_.end() || shouldDeferUpdates(viewTag, it->second)) {
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

void CSSAnimationsRegistry::handleMount(const SurfaceId surfaceId) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  for (const auto &[viewTag, group] : groups_) {
    if (group.getShadowNodeFamily()->getSurfaceId() == surfaceId) {
      updateVisibility(viewTag, group);
    }
  }
}

void CSSAnimationsRegistry::syncDeferredUpdates() {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  // A commit that shows a hidden view applies the registry, so it must carry the current style.
  // Reset styles are included, as in the regular flushes, because the reset of an animation that
  // finished while the view was hidden has not been committed yet.
  const auto tags = std::exchange(deferredTags_, {});
  for (const auto viewTag : tags) {
    const auto it = groups_.find(viewTag);
    if (it != groups_.end()) {
      setInUpdatesRegistry(it->second.getShadowNodeFamily(), it->second.computeStyle(true));
    }
  }
}

void CSSAnimationsRegistry::updateVisibility(const Tag viewTag, const CSSAnimationsGroup &group) {
  // An animation of `display` must keep running on a view that it hides itself, or it could never show it again.
  const bool includeSelf = !group.animatesProperty("display");
  if (mountedRootsRegistry_->isHidden(*group.getShadowNodeFamily(), includeSelf)) {
    hiddenTags_.insert(viewTag);
  } else {
    hiddenTags_.erase(viewTag);
  }
}

bool CSSAnimationsRegistry::shouldDeferUpdates(const Tag viewTag, const CSSAnimationsGroup &group) {
  // Only a running group is ticked again, so the update of a group that just finished or
  // paused is never deferred. The first tick after the view is shown commits its style.
  if (hiddenTags_.contains(viewTag) && group.hasRunningAnimation()) {
    deferredTags_.insert(viewTag);
    return true;
  }
  deferredTags_.erase(viewTag);
  return false;
}

CSSAnimationsRegistry::AnimationObserver::AnimationObserver(CSSAnimationsRegistry &owner) : owner_(owner) {}

void CSSAnimationsRegistry::AnimationObserver::onAnimationUpdate(const Tag viewTag) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  owner_.updatedTags_.insert(viewTag);
}

void CSSAnimationsRegistry::AnimationObserver::onAnimationNeedsRevert(const Tag viewTag) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  owner_.pendingRevertTags_.insert(viewTag);
}

void CSSAnimationsRegistry::AnimationObserver::onAnimationEvent(
    const Tag viewTag,
    const std::string &animationName,
    const CSSEventType type,
    const double elapsedTimeMs) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  owner_.eventsEmitter_->emit(createCSSEvent(viewTag, type, animationName, elapsedTimeMs));
}

void CSSAnimationsRegistry::removeTag(const Tag viewTag) {
  auto it = groups_.find(viewTag);
  if (it != groups_.end()) {
    it->second.unschedule(*loop_);
    // Report before erasing, since the animations are destroyed with the group.
    reportCancellations(it->second.getAnimations(), loop_->resolveTimestamp());
    groups_.erase(it);
  }
  hiddenTags_.erase(viewTag);
  deferredTags_.erase(viewTag);
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

  // Whatever is left was not carried over into the new group, so those
  // animations are being interrupted rather than completed.
  for (const auto &[_, leftoverAnimations] : oldByName) {
    reportCancellations(leftoverAnimations, timestamp);
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
