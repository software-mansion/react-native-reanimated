#include <reanimated/Fabric/updates/AnimatedPropsRegistry.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>
#include <reanimated/Tools/FeatureFlags.h>
#include <reanimated/Tools/TextMetrics.h>

#include <react/debug/react_native_assert.h>

#include <functional>
#include <memory>
#include <utility>
#include <vector>

namespace reanimated {

static inline std::shared_ptr<const ShadowNode> shadowNodeFromValue(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeWrapper) {
  return Bridging<std::shared_ptr<const ShadowNode>>::fromJs(rt, shadowNodeWrapper);
}

static void roundTextMetrics(jsi::Runtime &rt, const jsi::Value &updates) {
  const auto object = updates.asObject(rt);
  for (const auto *propName : TEXT_METRIC_PROP_NAMES) {
    const auto value = object.getProperty(rt, propName);
    if (value.isNumber()) {
      object.setProperty(rt, propName, roundTextMetric(value.asNumber()));
    }
  }
}

void AnimatedPropsRegistry::update(jsi::Runtime &rt, const jsi::Value &operations, const double timestamp) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  auto operationsArray = operations.asObject(rt).asArray(rt);

  for (size_t i = 0, length = operationsArray.size(rt); i < length; ++i) {
    auto item = operationsArray.getValueAtIndex(rt, i).asObject(rt);
    auto shadowNodeWrapper = item.getProperty(rt, "shadowNodeWrapper");
    auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);

    jsi::Value updates = item.getProperty(rt, "updates");
    roundTextMetrics(rt, updates);

    if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
      addJSIPropsToAnimatedPropsBatch(shadowNode->getFamilyShared(), rt, updates);
    } else {
      addUpdatesToBatch(shadowNode->getFamilyShared(), jsi::dynamicFromValue(rt, updates));
    }

    // When USE_ANIMATION_BACKEND is enabled, updates bypass `updatesRegistry_`,
    // so entries added to `timestampMap_` would never be synced and thus never
    // evicted, leaking until view unmount.
    if constexpr (
        StaticFeatureFlags::getFlag("FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS") &&
        !StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
      const auto tag = shadowNode->getTag();
      timestampMap_[tag] = timestamp;
      revisionMap_[tag] = ++lastRevision_;
      awaitingCommitRevisions_.erase(tag);
      // If JS already has a `settledProps` snapshot for this tag, it is now
      // stale — schedule a refresh on the next `collectSettledUpdates`.
      if (syncedTags_.erase(tag) > 0) {
        invalidatedTags_.insert(tag);
      }
    }
  }
}

jsi::Value AnimatedPropsRegistry::collectSettledUpdates(
    jsi::Runtime &rt,
    const double settledTimestamp,
    const std::function<bool(const ShadowNodeFamily &)> &isMounted) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());

  struct CollectedUpdate {
    Tag viewTag;
    std::reference_wrapper<const folly::dynamic> styleProps;
    uint64_t revision;
  };
  std::vector<CollectedUpdate> updates;
  std::vector<Tag> unmountedTags;

  for (auto it = updatesRegistry_.begin(); it != updatesRegistry_.end();) {
    const auto viewTag = it->first;

    if (syncedTags_.contains(viewTag)) {
      // React committed the latest value for this tag — the registry entry is
      // redundant. `syncedTags_` is intentionally retained to detect
      // re-animation staleness. Note that `syncedTags_` and `invalidatedTags_`
      // are disjoint — `update()` moves tags from the former to the latter.
      timestampMap_.erase(viewTag);
      revisionMap_.erase(viewTag);
      it = updatesRegistry_.erase(it);
      continue;
    }

    const auto timestampIt = timestampMap_.find(viewTag);
    if (timestampIt == timestampMap_.end()) {
      ++it;
      continue;
    }
    const bool isSettled = timestampIt->second < settledTimestamp;
    const auto &shadowNodeFamily = it->second.first;
    if (isSettled && (!shadowNodeFamily || !isMounted(*shadowNodeFamily))) {
      // The view can't confirm a commit anymore.
      unmountedTags.push_back(viewTag);
      ++it;
      continue;
    }
    const auto invalidatedIt = invalidatedTags_.find(viewTag);
    const bool isInvalidated = invalidatedIt != invalidatedTags_.end();
    if (isSettled || isInvalidated) {
      const auto revision = revisionMap_[viewTag];
      updates.push_back({viewTag, std::cref(it->second.second), revision});
      if (isSettled) {
        // Only settled-path tags can become "synced" so that an ongoing
        // animation doesn't re-trigger an invalidation/sync on every GC tick.
        awaitingCommitRevisions_[viewTag] = revision;
      }
      if (isInvalidated) {
        // Only erase serviced invalidations; if a tag was invalidated but the
        // matching update batch hasn't been flushed into updatesRegistry_ yet,
        // we leave the entry so the next sync picks it up.
        invalidatedTags_.erase(invalidatedIt);
      }
    }
    ++it;
  }

  const jsi::Array array(rt, updates.size());
  size_t i = 0;
  for (const auto &[viewTag, styleProps, revision] : updates) {
    const jsi::Object item(rt);
    item.setProperty(rt, "viewTag", viewTag);
    item.setProperty(rt, "styleProps", jsi::valueFromDynamic(rt, styleProps.get()));
    item.setProperty(rt, "revision", static_cast<double>(revision));
    array.setValueAtIndex(rt, i++, item);
  }

  for (const auto tag : unmountedTags) {
    removeTag(tag);
  }

  return jsi::Value(rt, array);
}

void AnimatedPropsRegistry::markSettledUpdateCommitted(const Tag tag, const uint64_t revision) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());

  const auto it = awaitingCommitRevisions_.find(tag);
  if (it == awaitingCommitRevisions_.end() || it->second != revision) {
    return;
  }
  awaitingCommitRevisions_.erase(it);
  syncedTags_.insert(tag);
}

void AnimatedPropsRegistry::removeTag(const Tag tag) {
  updatesRegistry_.erase(tag);
  timestampMap_.erase(tag);
  revisionMap_.erase(tag);
  awaitingCommitRevisions_.erase(tag);
  syncedTags_.erase(tag);
  invalidatedTags_.erase(tag);
}

} // namespace reanimated
