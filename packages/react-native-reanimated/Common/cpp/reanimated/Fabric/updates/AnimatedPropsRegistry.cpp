#include <reanimated/Fabric/updates/AnimatedPropsRegistry.h>
#include <reanimated/Fabric/updates/UpdatesRegistryManager.h>
#include <reanimated/Tools/FeatureFlags.h>
#include <reanimated/Tools/TextMetrics.h>

#include <reanimated/Compat/ReactNativeDebug.h>

#include <algorithm>
#include <memory>
#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace reanimated {

static inline std::shared_ptr<const ShadowNode> shadowNodeFromValue(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeWrapper) {
  return Bridging<std::shared_ptr<const ShadowNode>>::fromJs(rt, shadowNodeWrapper);
}

static folly::dynamic propsFromValue(jsi::Runtime &rt, const jsi::Value &value);

static folly::dynamic propsFromObject(jsi::Runtime &rt, const jsi::Object &object) {
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
    return nullptr;
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
    result.insert(name.utf8(rt), propsFromValue(rt, property));
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
    return propsFromObject(rt, value.getObject(rt));
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

#if REACT_NATIVE_VERSION_MINOR >= 89
[[maybe_unused]] static std::optional<std::string> textFromChildren(jsi::Runtime &rt, const jsi::Value &children) {
  if (children.isString()) {
    return children.getString(rt).utf8(rt);
  }
  if (children.isNumber()) {
    return folly::dynamic(children.getNumber()).asString();
  }
  return std::nullopt;
}

[[maybe_unused]] static jsi::Object withoutChildren(jsi::Runtime &rt, const jsi::Object &updates) {
  jsi::Object rest(rt);
  const auto names = updates.getPropertyNames(rt);
  for (size_t i = 0, length = names.size(rt); i < length; ++i) {
    const auto name = names.getValueAtIndex(rt, i).asString(rt);
    if (name.utf8(rt) != "children") {
      rest.setProperty(rt, name, updates.getProperty(rt, name));
    }
  }
  return rest;
}
#endif

void AnimatedPropsRegistry::update(jsi::Runtime &rt, const jsi::Value &operations, const double timestamp) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  auto operationsArray = operations.asObject(rt).asArray(rt);

  // Created once per call instead of once per view.
  const auto shadowNodeWrapperName = jsi::PropNameID::forAscii(rt, "shadowNodeWrapper");
  const auto updatesName = jsi::PropNameID::forAscii(rt, "updates");
  [[maybe_unused]] const auto isAnimatedPropsName = jsi::PropNameID::forAscii(rt, "isAnimatedProps");

  for (size_t i = 0, length = operationsArray.size(rt); i < length; ++i) {
    auto item = operationsArray.getValueAtIndex(rt, i).asObject(rt);
    auto shadowNodeWrapper = item.getProperty(rt, shadowNodeWrapperName);
    auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);
    if (isUnmounted(shadowNode->getFamily())) {
      continue;
    }

    jsi::Value updates = item.getProperty(rt, updatesName);

    if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
      roundTextMetrics(rt, updates);
#if REACT_NATIVE_VERSION_MINOR >= 89
      if (isTextComponent(*shadowNode)) {
        const auto updatesObject = updates.asObject(rt);
        if (updatesObject.hasProperty(rt, "children")) {
          if (auto text = textFromChildren(rt, updatesObject.getProperty(rt, "children"))) {
            addTextToAnimatedPropsBatch(shadowNode->getFamilyShared(), std::move(*text));
          }
          auto rest = withoutChildren(rt, updatesObject);
          if (rest.getPropertyNames(rt).size(rt) > 0) {
            jsi::Value restValue(rt, rest);
            addJSIPropsToAnimatedPropsBatch(shadowNode->getFamilyShared(), rt, restValue);
          }
          continue;
        }
      }
#endif
      addJSIPropsToAnimatedPropsBatch(shadowNode->getFamilyShared(), rt, updates);
    } else {
      auto dynamicUpdates = propsFromValue(rt, updates);
      roundTextMetrics(dynamicUpdates);
      // With USE_ANIMATION_BACKEND, no update reaches `updatesRegistry_`, so
      // `collectSettledUpdates` never reads `writeHistories_`.
      if constexpr (StaticFeatureFlags::getFlag("FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS")) {
        const bool isAnimatedProps = item.getProperty(rt, isAnimatedPropsName).asBool();
        trackUpdate(shadowNode->getTag(), dynamicUpdates, isAnimatedProps, timestamp);
      }
      addUpdatesToBatch(shadowNode->getFamilyShared(), std::move(dynamicUpdates));
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
  std::vector<jsi::Value> keysLastWrittenByAnimatedStyle;

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
      keysLastWrittenByAnimatedStyle.emplace_back(jsi::String::createFromUtf8(rt, keyString));
    }
  }

  jsi::Array keysLastWrittenByAnimatedStyleArray(rt, keysLastWrittenByAnimatedStyle.size());
  for (size_t i = 0; i < keysLastWrittenByAnimatedStyle.size(); ++i) {
    keysLastWrittenByAnimatedStyleArray.setValueAtIndex(rt, i, std::move(keysLastWrittenByAnimatedStyle[i]));
  }

  jsi::Object settledUpdate(rt);
  settledUpdate.setProperty(rt, "viewTag", viewTag);
  settledUpdate.setProperty(rt, "props", std::move(settledProps));
  settledUpdate.setProperty(rt, "style", std::move(settledStyle));
  settledUpdate.setProperty(rt, "keysLastWrittenByAnimatedStyle", std::move(keysLastWrittenByAnimatedStyleArray));
  return settledUpdate;
}

jsi::Value AnimatedPropsRegistry::collectSettledUpdates(
    jsi::Runtime &rt,
    const double settledTimestamp,
    const std::function<bool(Tag)> &isViewRegistered) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());

  std::vector<jsi::Object> settledUpdates;
  const auto pendingTags = getPendingTags();

  for (auto it = updatesRegistry_.begin(); it != updatesRegistry_.end();) {
    const auto viewTag = it->first;
    const bool isSynced = syncedTags_.contains(viewTag);
    const auto writeHistoryIt = writeHistories_.find(viewTag);
    const bool hasWriteHistory = writeHistoryIt != writeHistories_.end();
    const bool isSettled = hasWriteHistory && writeHistoryIt->second.lastWriteTimestamp < settledTimestamp;
    const auto invalidatedIt = invalidatedTags_.find(viewTag);
    const bool isInvalidated = invalidatedIt != invalidatedTags_.end();
    const bool hasWork = isSynced || (hasWriteHistory && (isSettled || isInvalidated));

    if (!hasWork || pendingTags.contains(viewTag) || !isViewRegistered(viewTag)) {
      ++it;
      continue;
    }

    if (isSynced) {
      // React already has the latest value for this tag (synced on a previous
      // call, so the `settledProps` state is committed by now) — the registry
      // entry is redundant. `syncedTags_` is intentionally retained to detect
      // re-animation staleness. Note that `syncedTags_` and `invalidatedTags_`
      // are disjoint — `update()` moves tags from the former to the latter.
      it = updatesRegistry_.erase(it);
      continue;
    }

    settledUpdates.push_back(createSettledUpdate(rt, viewTag, it->second.second, writeHistoryIt->second));
    if (isSettled) {
      // Only settled-path tags are tracked as "synced" so that an ongoing
      // animation doesn't re-trigger an invalidation/sync on every GC tick.
      syncedTags_.insert(viewTag);
    }
    if (isInvalidated) {
      invalidatedTags_.erase(invalidatedIt);
    }
    ++it;
  }

  const jsi::Array array(rt, settledUpdates.size());
  for (size_t i = 0; i < settledUpdates.size(); ++i) {
    array.setValueAtIndex(rt, i, std::move(settledUpdates[i]));
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

bool AnimatedPropsRegistry::hasPendingSettledUpdates(const std::function<bool(Tag)> &isViewRegistered) const {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());
  const auto pendingTags = getPendingTags();
  if (std::any_of(pendingTags.begin(), pendingTags.end(), isViewRegistered)) {
    return true;
  }
  return std::any_of(updatesRegistry_.begin(), updatesRegistry_.end(), [&](const auto &entry) {
    const auto viewTag = entry.first;
    const bool hasWork = syncedTags_.contains(viewTag) || writeHistories_.contains(viewTag);
    return hasWork && isViewRegistered(viewTag);
  });
}

void AnimatedPropsRegistry::removeTag(const Tag tag) {
  updatesRegistry_.erase(tag);
  writeHistories_.erase(tag);
  syncedTags_.erase(tag);
  invalidatedTags_.erase(tag);
}

} // namespace reanimated
