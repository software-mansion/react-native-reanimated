#include <cxxreact/ReactNativeVersion.h>
#include <reanimated/Fabric/updates/AnimatedPropsRegistry.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>
#include <reanimated/Tools/FeatureFlags.h>

#include <react/debug/react_native_assert.h>

#include <memory>
#include <utility>

namespace reanimated {

static inline std::shared_ptr<const ShadowNode> shadowNodeFromValue(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeWrapper) {
  return Bridging<std::shared_ptr<const ShadowNode>>::fromJs(rt, shadowNodeWrapper);
}

void AnimatedPropsRegistry::update(jsi::Runtime &rt, const jsi::Value &operations, const double timestamp) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  auto operationsArray = operations.asObject(rt).asArray(rt);

  for (size_t i = 0, length = operationsArray.size(rt); i < length; ++i) {
    auto item = operationsArray.getValueAtIndex(rt, i).asObject(rt);
    auto shadowNodeWrapper = item.getProperty(rt, "shadowNodeWrapper");
    auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);

    jsi::Value updates = item.getProperty(rt, "updates");

    if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
#if REACT_NATIVE_VERSION_MINOR >= 85
      addJSIPropsToAnimatedPropsBatch(shadowNode->getFamilyShared(), rt, updates);
#endif
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
      // If JS already has a `settledProps` snapshot for this tag, it is now
      // stale — schedule a refresh on the next `collectSettledUpdates`.
      if (syncedTags_.erase(tag) > 0) {
        invalidatedTags_.insert(tag);
      }
    }
  }
}

jsi::Value AnimatedPropsRegistry::collectSettledUpdates(jsi::Runtime &rt, const double settledTimestamp) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());

  std::vector<std::pair<Tag, std::reference_wrapper<const folly::dynamic>>> updates;

  for (auto it = updatesRegistry_.begin(); it != updatesRegistry_.end();) {
    const auto viewTag = it->first;

    if (syncedTags_.count(viewTag) > 0) {
      // React already has the latest value for this tag (synced on a previous
      // call, so the `settledProps` state is committed by now) — the registry
      // entry is redundant. `syncedTags_` is intentionally retained to detect
      // re-animation staleness. Note that `syncedTags_` and `invalidatedTags_`
      // are disjoint — `update()` moves tags from the former to the latter.
      timestampMap_.erase(viewTag);
      it = updatesRegistry_.erase(it);
      continue;
    }

    const auto timestampIt = timestampMap_.find(viewTag);
    if (timestampIt == timestampMap_.end()) {
      ++it;
      continue;
    }
    const bool isSettled = timestampIt->second < settledTimestamp;
    const auto invalidatedIt = invalidatedTags_.find(viewTag);
    const bool isInvalidated = invalidatedIt != invalidatedTags_.end();
    if (isSettled || isInvalidated) {
      updates.emplace_back(viewTag, std::cref(it->second.second));
      if (isSettled) {
        // Only settled-path tags are tracked as "synced" so that an ongoing
        // animation doesn't re-trigger an invalidation/sync on every GC tick.
        syncedTags_.insert(viewTag);
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
  for (const auto &[viewTag, styleProps] : updates) {
    const jsi::Object item(rt);
    item.setProperty(rt, "viewTag", viewTag);
    item.setProperty(rt, "styleProps", jsi::valueFromDynamic(rt, styleProps.get()));
    array.setValueAtIndex(rt, i++, item);
  }

  return jsi::Value(rt, array);
}

void AnimatedPropsRegistry::removeTag(const Tag tag) {
  updatesRegistry_.erase(tag);
  timestampMap_.erase(tag);
  syncedTags_.erase(tag);
  invalidatedTags_.erase(tag);
}

} // namespace reanimated
