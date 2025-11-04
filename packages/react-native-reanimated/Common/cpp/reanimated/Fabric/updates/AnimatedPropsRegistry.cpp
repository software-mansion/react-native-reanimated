#include <reanimated/Fabric/updates/AnimatedPropsRegistry.h>

#include <memory>
#include <utility>

namespace reanimated {

#if REACT_NATIVE_MINOR_VERSION >= 81
static inline std::shared_ptr<const ShadowNode> shadowNodeFromValue(
    jsi::Runtime &rt,
    const jsi::Value &shadowNodeWrapper) {
  return Bridging<std::shared_ptr<const ShadowNode>>::fromJs(rt, shadowNodeWrapper);
}
#endif

void AnimatedPropsRegistry::update(jsi::Runtime &rt, const jsi::Value &operations, const double timestamp) {
  auto operationsArray = operations.asObject(rt).asArray(rt);

  for (size_t i = 0, length = operationsArray.size(rt); i < length; ++i) {
    auto item = operationsArray.getValueAtIndex(rt, i).asObject(rt);
    auto shadowNodeWrapper = item.getProperty(rt, "shadowNodeWrapper");
    auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);

    const jsi::Value &updates = item.getProperty(rt, "updates");
    addUpdatesToBatch(shadowNode, jsi::dynamicFromValue(rt, updates));

    timestampMap_[shadowNode->getTag()] = timestamp;
  }
}

void AnimatedPropsRegistry::remove(const Tag tag) {
  updatesRegistry_.erase(tag);
}

jsi::Value AnimatedPropsRegistry::getUpdatesOlderThanTimestamp(jsi::Runtime &rt, const double timestamp) {
  std::set<Tag> viewTags;
  {
    auto lock1 = lock();
    for (const auto &[viewTag, viewTimestamp] : timestampMap_) {
      if (viewTimestamp < timestamp) {
        viewTags.insert(viewTag);
      }
    }
  }

  PropsMap propsMap;
  collectProps(propsMap); // TODO: don't call collectProps since it locks again

  const jsi::Array array(rt, viewTags.size());
  size_t idx = 0;
  for (const auto &[family, vectorOfRawProps] : propsMap) {
    const auto viewTag = family->getTag();
    if (!viewTags.contains(viewTag)) {
      continue;
    }

    folly::dynamic styleProps = folly::dynamic::object();
    for (const auto &rawProps : vectorOfRawProps) {
      styleProps.update(static_cast<folly::dynamic>(rawProps));
    }

    const jsi::Object item(rt);
    item.setProperty(rt, "viewTag", viewTag);
    item.setProperty(rt, "styleProps", jsi::valueFromDynamic(rt, styleProps));
    array.setValueAtIndex(rt, idx++, item);
  }

  return jsi::Value(rt, array);
}

void AnimatedPropsRegistry::removeUpdatesOlderThanTimestamp(const double timestamp) {
  auto lock1 = lock();

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
