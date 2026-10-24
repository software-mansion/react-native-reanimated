#include <reanimated/Fabric/updates/AnimatedPropsRegistry.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>
#include <reanimated/Tools/FeatureFlags.h>
#include <reanimated/Tools/TextMetrics.h>

#include <react/debug/react_native_assert.h>

#include <algorithm>
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

[[maybe_unused]] static void roundTextMetrics(jsi::Runtime &rt, const jsi::Value &updates) {
  const auto object = updates.asObject(rt);
  for (const auto *propName : TEXT_METRIC_PROP_NAMES) {
    const auto value = object.getProperty(rt, propName);
    if (value.isNumber()) {
      object.setProperty(rt, propName, roundTextMetric(value.asNumber()));
    }
  }
}

static void roundTextMetrics(folly::dynamic &updates) {
  for (const auto *propName : TEXT_METRIC_PROP_NAMES) {
    const auto it = updates.find(propName);
    if (it != updates.items().end() && it->second.isNumber()) {
      it->second = roundTextMetric(it->second.asDouble());
    }
  }
}

static folly::dynamic propsFromValue(jsi::Runtime &rt, const jsi::Value &value);

// Same result as jsi::dynamicFromValue without a key filter, minus its
// generic bookkeeping: each object is checked for being an array or a function
// once, and each property is written straight into the result.
static folly::dynamic propsFromObject(jsi::Runtime &rt, const jsi::Object &object, const bool functionAsNull) {
  if (object.isArray(rt)) {
    const auto array = object.getArray(rt);
    const size_t size = array.size(rt);
    folly::dynamic result = folly::dynamic::array();
    result.reserve(size);
    for (size_t i = 0; i < size; ++i) {
      result.push_back(propsFromValue(rt, array.getValueAtIndex(rt, i)));
    }
    return result;
  }
  if (object.isFunction(rt)) {
    // Like JSON.stringify, functions in object properties become null.
    if (functionAsNull) {
      return nullptr;
    }
    throw jsi::JSError(rt, "JS Functions are not convertible to dynamic");
  }
  const auto names = object.getPropertyNames(rt);
  const size_t size = names.size(rt);
  folly::dynamic result = folly::dynamic::object();
  for (size_t i = 0; i < size; ++i) {
    const auto name = names.getValueAtIndex(rt, i).getString(rt);
    const auto property = object.getProperty(rt, name);
    if (property.isUndefined()) {
      continue;
    }
    result.insert(
        name.utf8(rt),
        property.isObject() ? propsFromObject(rt, property.getObject(rt), true) : propsFromValue(rt, property));
  }
  return result;
}

static folly::dynamic propsFromValue(jsi::Runtime &rt, const jsi::Value &value) {
  if (value.isNumber()) {
    return value.getNumber();
  }
  if (value.isString()) {
    return value.getString(rt).utf8(rt);
  }
  if (value.isObject()) {
    return propsFromObject(rt, value.getObject(rt), false);
  }
  if (value.isUndefined() || value.isNull()) {
    return nullptr;
  }
  if (value.isBool()) {
    return value.getBool();
  }
  if (value.isBigInt()) {
    throw jsi::JSError(rt, "JS BigInts are not convertible to dynamic");
  }
  if (value.isSymbol()) {
    throw jsi::JSError(rt, "JS Symbols are not convertible to dynamic");
  }
  throw jsi::JSError(rt, "Value is not convertible to dynamic");
}

void AnimatedPropsRegistry::update(jsi::Runtime &rt, const jsi::Value &operations, const double timestamp) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  auto operationsArray = operations.asObject(rt).asArray(rt);

  for (size_t i = 0, length = operationsArray.size(rt); i < length; ++i) {
    auto item = operationsArray.getValueAtIndex(rt, i).asObject(rt);
    auto shadowNodeWrapper = item.getProperty(rt, "shadowNodeWrapper");
    auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);
    if (isUnmounted(shadowNode->getFamily())) {
      continue;
    }

    jsi::Value updates = item.getProperty(rt, "updates");

    if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
      roundTextMetrics(rt, updates);
      addJSIPropsToAnimatedPropsBatch(shadowNode->getFamilyShared(), rt, updates);
    } else {
      auto props = propsFromValue(rt, updates);
      roundTextMetrics(props);
      addUpdatesToBatch(shadowNode->getFamilyShared(), props);
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

jsi::Value AnimatedPropsRegistry::collectSettledUpdates(
    jsi::Runtime &rt,
    const double settledTimestamp,
    const std::unordered_set<Tag> &registeredViewTags) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());

  std::vector<std::pair<Tag, std::reference_wrapper<const folly::dynamic>>> updates;

  for (auto it = updatesRegistry_.begin(); it != updatesRegistry_.end();) {
    const auto viewTag = it->first;

    if (!registeredViewTags.contains(viewTag)) {
      ++it;
      continue;
    }

    if (syncedTags_.contains(viewTag)) {
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

void AnimatedPropsRegistry::removeUnmounted(const ShadowNodeFamily::Shared &shadowNodeFamily) {
  UpdatesRegistry::removeUnmounted(shadowNodeFamily);
  const auto tag = shadowNodeFamily->getTag();
  unmountedFamilies_[tag] = shadowNodeFamily;
  if (unmountedFamilies_.size() >= unmountedFamiliesPruneThreshold_) {
    pruneExpiredUnmountedFamilies();
  }
}

void AnimatedPropsRegistry::handleRemount(const Tag tag) {
  unmountedFamilies_.erase(tag);
}

bool AnimatedPropsRegistry::isUnmounted(const ShadowNodeFamily &shadowNodeFamily) const {
  const auto it = unmountedFamilies_.find(shadowNodeFamily.getTag());
  return it != unmountedFamilies_.end() && it->second.lock().get() == &shadowNodeFamily;
}

void AnimatedPropsRegistry::pruneExpiredUnmountedFamilies() {
  std::erase_if(unmountedFamilies_, [](const auto &entry) { return entry.second.expired(); });
  unmountedFamiliesPruneThreshold_ = std::max(MIN_UNMOUNTED_FAMILIES_PRUNE_THRESHOLD, 2 * unmountedFamilies_.size());
}

void AnimatedPropsRegistry::removeTag(const Tag tag) {
  updatesRegistry_.erase(tag);
  timestampMap_.erase(tag);
  syncedTags_.erase(tag);
  invalidatedTags_.erase(tag);
}

} // namespace reanimated
