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

void AnimatedPropsRegistry::update(jsi::Runtime &rt, const jsi::Value &operations) {
  auto operationsArray = operations.asObject(rt).asArray(rt);

  for (size_t i = 0, length = operationsArray.size(rt); i < length; ++i) {
    auto item = operationsArray.getValueAtIndex(rt, i).asObject(rt);
    auto shadowNodeWrapper = item.getProperty(rt, "shadowNodeWrapper");
    auto shadowNode = shadowNodeFromValue(rt, shadowNodeWrapper);

    const jsi::Value &updates = item.getProperty(rt, "updates");
    auto props = jsi::dynamicFromValue(rt, updates);
    
    if (!strcmp(shadowNode->getComponentName(), "Paragraph")) {
      for (const auto &[key, value] : props.items()) {
        if (key.getString() == "text") {
          const auto &childShadowNode = shadowNode->getChildren()[0];
          addUpdatesToBatch(childShadowNode, folly::dynamic::object("text", value));
          break;
        }
      }
      if (props.size() == 1) {
        continue;
      }
    }
    
    addUpdatesToBatch(shadowNode, props);
  }
}

void AnimatedPropsRegistry::remove(const Tag tag) {
  updatesRegistry_.erase(tag);
}

} // namespace reanimated
