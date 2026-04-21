#include <reanimated/Fabric/updates/AnimatedPropsRegistry.h>
#include <reanimated/Fabric/updates/propsLayoutFilter.h>
#include <reanimated/Tools/FeatureFlags.h>

#include <react/renderer/animationbackend/AnimatedPropsBuilder.h>

#include <memory>
#include <utility>

namespace reanimated {

namespace {

bool hasLayoutPropsInObject(jsi::Runtime &rt, jsi::Object &obj) {
  jsi::Array names = obj.getPropertyNames(rt);
  const size_t n = names.size(rt);
  for (size_t ki = 0; ki < n; ++ki) {
    jsi::Value keyVal = names.getValueAtIndex(rt, ki);
    if (!keyVal.isString()) {
      continue;
    }
    const auto keyStr = keyVal.asString(rt).utf8(rt);
    const auto propName = propNameFromString(keyStr);
    if (propName.has_value() && isLayoutProp(propName.value())) {
      return true;
    }
  }
  return false;
}

} // namespace

static inline std::shared_ptr<const ShadowNode> shadowNodeFromValue(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeWrapper) {
  return Bridging<std::shared_ptr<const ShadowNode>>::fromJs(rt, shadowNodeWrapper);
}

void AnimatedPropsRegistry::update(jsi::Runtime &rt, const jsi::Value &operations, const double timestamp) {
  auto operationsArray = operations.asObject(rt).asArray(rt);

  for (size_t i = 0, length = operationsArray.size(rt); i < length; ++i) {
    auto item = operationsArray.getValueAtIndex(rt, i).asObject(rt);
    auto shadowNodeWrapper = item.getProperty(rt, "shadowNodeWrapper");
    auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);

    jsi::Value updates = item.getProperty(rt, "updates");

    if constexpr (StaticFeatureFlags::getFlag("USE_ANIMATION_BACKEND")) {
      if (!updates.isObject()) {
        continue;
      }
      jsi::Value updatesOwned(rt, updates);
      auto updatesObj = updatesOwned.asObject(rt);
      const bool hasLayoutUpdates = hasLayoutPropsInObject(rt, updatesObj);
      AnimatedPropsBuilder builder;
      builder.storeJSI(rt, updatesOwned);
      addAnimatedPropsToBatch(shadowNode->getFamilyShared(), builder.get(), hasLayoutUpdates);
    } else {
      auto dynamic = jsi::dynamicFromValue(rt, updates);
      addUpdatesToBatch(shadowNode->getFamilyShared(), dynamic);
    }

    if constexpr (StaticFeatureFlags::getFlag("FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS")) {
      timestampMap_[shadowNode->getTag()] = timestamp;
    }
  }
}

void AnimatedPropsRegistry::remove(const Tag tag) {
  updatesRegistry_.erase(tag);
  timestampMap_.erase(tag);
}

jsi::Value AnimatedPropsRegistry::getUpdatesOlderThanTimestamp(jsi::Runtime &rt, const double timestamp) {
  std::vector<std::pair<Tag, std::reference_wrapper<const folly::dynamic>>> updates;

  for (const auto &[viewTag, pair] : updatesRegistry_) {
    auto it = timestampMap_.find(viewTag);
    if (it != timestampMap_.end() && it->second < timestamp) {
      updates.emplace_back(viewTag, std::cref(pair.second));
    }
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

void AnimatedPropsRegistry::removeUpdatesOlderThanTimestamp(const double timestamp) {
  for (auto it = timestampMap_.begin(); it != timestampMap_.end();) {
    const auto viewTag = it->first;
    const auto viewTimestamp = it->second;
    if (viewTimestamp < timestamp) {
      it = timestampMap_.erase(it);
      updatesRegistry_.erase(viewTag);
    } else {
      it++;
    }
  }
}

} // namespace reanimated
