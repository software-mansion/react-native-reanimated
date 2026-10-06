#include <reanimated/Fabric/updates/AnimatedPropsRegistry.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>
#include <reanimated/Tools/FeatureFlags.h>
#include <reanimated/Tools/TextMetrics.h>

#include <react/debug/react_native_assert.h>

#include <memory>
#include <string>
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
      const auto dynamicUpdates = jsi::dynamicFromValue(rt, updates);
      // With USE_ANIMATION_BACKEND, no update reaches `updatesRegistry_`, so
      // `collectSettledUpdates` never reads `writeHistories_`.
      if constexpr (StaticFeatureFlags::getFlag("FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS")) {
        const bool isAnimatedProps = item.getProperty(rt, "isAnimatedProps").asBool();
        trackUpdate(shadowNode->getTag(), dynamicUpdates, isAnimatedProps, timestamp);
      }
      addUpdatesToBatch(shadowNode->getFamilyShared(), dynamicUpdates);
    }
  }
}

void AnimatedPropsRegistry::trackUpdate(
    const Tag tag,
    const folly::dynamic &updates,
    const bool isAnimatedProps,
    const double timestamp) {
  auto &writeHistory = writeHistories_[tag];
  writeHistory.lastWriteTimestamp = timestamp;

  for (const auto &key : updates.keys()) {
    auto &keyOrigins = writeHistory.keyOrigins[key.getString()];
    if (isAnimatedProps) {
      keyOrigins.writtenByAnimatedProps = true;
    } else {
      keyOrigins.writtenByAnimatedStyle = true;
    }
    keyOrigins.lastWrittenByAnimatedStyle = !isAnimatedProps;
  }

  invalidateSyncedTag(tag);
}

void AnimatedPropsRegistry::invalidateSyncedTag(const Tag tag) {
  // If JS already has a `settledProps` snapshot for this tag, it is now
  // stale — schedule a refresh on the next `collectSettledUpdates`.
  if (syncedTags_.erase(tag) > 0) {
    invalidatedTags_.insert(tag);
  }
}

jsi::Object AnimatedPropsRegistry::createSettledUpdate(
    jsi::Runtime &rt,
    const Tag viewTag,
    const folly::dynamic &props,
    const WriteHistory &writeHistory) {
  jsi::Object settledProps(rt);
  jsi::Object settledStyle(rt);
  std::vector<const std::string *> keysLastWrittenByAnimatedStyle;

  for (const auto &[key, value] : props.items()) {
    const auto &keyString = key.getString();
    const auto keyOriginsIt = writeHistory.keyOrigins.find(keyString);
    if (keyOriginsIt == writeHistory.keyOrigins.end()) {
      continue;
    }
    const auto &keyOrigins = keyOriginsIt->second;
    if (keyOrigins.writtenByAnimatedProps) {
      settledProps.setProperty(rt, keyString.c_str(), jsi::valueFromDynamic(rt, value));
    }
    if (keyOrigins.writtenByAnimatedStyle) {
      settledStyle.setProperty(rt, keyString.c_str(), jsi::valueFromDynamic(rt, value));
    }
    if (keyOrigins.lastWrittenByAnimatedStyle) {
      keysLastWrittenByAnimatedStyle.push_back(&keyString);
    }
  }

  jsi::Array keysLastWrittenByAnimatedStyleArray(rt, keysLastWrittenByAnimatedStyle.size());
  for (size_t i = 0; i < keysLastWrittenByAnimatedStyle.size(); ++i) {
    keysLastWrittenByAnimatedStyleArray.setValueAtIndex(
        rt, i, jsi::String::createFromUtf8(rt, *keysLastWrittenByAnimatedStyle[i]));
  }

  jsi::Object settledUpdate(rt);
  settledUpdate.setProperty(rt, "viewTag", viewTag);
  settledUpdate.setProperty(rt, "props", std::move(settledProps));
  settledUpdate.setProperty(rt, "style", std::move(settledStyle));
  settledUpdate.setProperty(rt, "keysLastWrittenByAnimatedStyle", std::move(keysLastWrittenByAnimatedStyleArray));
  return settledUpdate;
}

jsi::Value AnimatedPropsRegistry::collectSettledUpdates(jsi::Runtime &rt, const double settledTimestamp) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());

  std::vector<jsi::Object> settledUpdates;

  for (auto it = updatesRegistry_.begin(); it != updatesRegistry_.end();) {
    const auto viewTag = it->first;

    if (syncedTags_.contains(viewTag)) {
      // React already has the latest value for this tag (synced on a previous
      // call, so the `settledProps` state is committed by now) — the registry
      // entry is redundant. `syncedTags_` is intentionally retained to detect
      // re-animation staleness. Note that `syncedTags_` and `invalidatedTags_`
      // are disjoint — `update()` moves tags from the former to the latter.
      it = updatesRegistry_.erase(it);
      continue;
    }

    const auto writeHistoryIt = writeHistories_.find(viewTag);
    if (writeHistoryIt == writeHistories_.end()) {
      ++it;
      continue;
    }
    const auto &writeHistory = writeHistoryIt->second;
    const bool isSettled = writeHistory.lastWriteTimestamp < settledTimestamp;
    const auto invalidatedIt = invalidatedTags_.find(viewTag);
    const bool isInvalidated = invalidatedIt != invalidatedTags_.end();
    if (isSettled || isInvalidated) {
      settledUpdates.push_back(createSettledUpdate(rt, viewTag, it->second.second, writeHistory));
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

  const jsi::Array array(rt, settledUpdates.size());
  for (size_t i = 0; i < settledUpdates.size(); ++i) {
    array.setValueAtIndex(rt, i, std::move(settledUpdates[i]));
  }

  return jsi::Value(rt, array);
}

void AnimatedPropsRegistry::removeTag(const Tag tag) {
  updatesRegistry_.erase(tag);
  writeHistories_.erase(tag);
  syncedTags_.erase(tag);
  invalidatedTags_.erase(tag);
}

} // namespace reanimated
