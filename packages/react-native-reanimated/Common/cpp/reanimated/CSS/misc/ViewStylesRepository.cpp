#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/misc/ViewStylesRepository.h>

namespace reanimated {

ViewStylesRepository::ViewStylesRepository(
    const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
    const std::shared_ptr<AnimatedPropsRegistry> &animatedPropsRegistry)
    : staticPropsRegistry_(staticPropsRegistry),
      animatedPropsRegistry_(animatedPropsRegistry) {}

jsi::Value ViewStylesRepository::getNodeProp(
    const ShadowNode::Shared &shadowNode,
    const std::string &propName) {
  int tag = shadowNode->getTag();

  auto &cachedNode = shadowNodeCache_[tag];
  updateCacheIfNeeded(cachedNode, shadowNode);

  if (propName == "width" || propName == "height" || propName == "top" ||
      propName == "left") {
    const auto &layoutMetrics = cachedNode.layoutMetrics;

    if (propName == "width") {
      return {layoutMetrics.frame.size.width};
    } else if (propName == "height") {
      return {layoutMetrics.frame.size.height};
    } else if (propName == "top") {
      return {layoutMetrics.frame.origin.y};
    } else if (propName == "left") {
      return {layoutMetrics.frame.origin.x};
    }
  } else {
    const auto &viewProps = cachedNode.viewProps;

    if (propName == "opacity") {
      return {viewProps->opacity};
    } else if (propName == "zIndex") {
      return viewProps->zIndex.has_value() ? jsi::Value(*viewProps->zIndex)
                                           : jsi::Value(0);
    } else if (propName == "backgroundColor") {
      return {static_cast<int32_t>(*viewProps->backgroundColor)};
    }
  }

  throw std::runtime_error("[Reanimated] Unsupported property: " + propName);
}

jsi::Value ViewStylesRepository::getParentNodeProp(
    const ShadowNode::Shared &shadowNode,
    const std::string &propName) {
  const auto surfaceId = shadowNode->getSurfaceId();
  const auto &shadowTreeRegistry = uiManager_->getShadowTreeRegistry();

  ShadowNode::Shared parentNode = nullptr;

  shadowTreeRegistry.visit(surfaceId, [&](ShadowTree const &shadowTree) {
    auto currentRevision = shadowTree.getCurrentRevision();
    parentNode =
        dom::getParentNode(currentRevision.rootShadowNode, *shadowNode);
  });

  if (!parentNode) {
    return jsi::Value::undefined();
  }

  return getNodeProp(parentNode, propName);
}

jsi::Value ViewStylesRepository::getViewStyle(jsi::Runtime &rt, const Tag tag) {
  const auto animatedStyle = animatedPropsRegistry_->get(tag);
  const auto staticStyle = staticPropsRegistry_->get(tag);

  if (animatedStyle.empty() && staticStyle.empty()) {
    return jsi::Value::undefined();
  }
  if (animatedStyle.empty()) {
    return valueFromDynamic(rt, staticStyle);
  }
  if (staticStyle.empty()) {
    return valueFromDynamic(rt, animatedStyle);
  }

  const auto mergedStyle = folly::dynamic::merge(staticStyle, animatedStyle);
  return valueFromDynamic(rt, mergedStyle);
}

jsi::Value ViewStylesRepository::getStyleProp(
    jsi::Runtime &rt,
    const Tag tag,
    const PropertyPath &propertyPath) {
  std::stringstream propertyPathStream;
  auto animatedValue =
      getPropertyValue(rt, animatedPropsRegistry_->get(tag), propertyPath);
  if (!animatedValue.isUndefined()) {
    return animatedValue;
  }

  return getPropertyValue(rt, staticPropsRegistry_->get(tag), propertyPath);
}

void ViewStylesRepository::clearNodesCache() {
  shadowNodeCache_.clear();
}

void ViewStylesRepository::updateCacheIfNeeded(
    CachedShadowNode &cachedNode,
    const ShadowNode::Shared &shadowNode) {
  auto newestCloneOfShadowNode =
      uiManager_->getNewestCloneOfShadowNode(*shadowNode);

  // Check if newestCloneOfShadowNode is valid (is already mounted / not
  // yet unmounted)
  if (!newestCloneOfShadowNode) {
    return;
  }

  auto layoutableShadowNode =
      dynamic_cast<const LayoutableShadowNode *>(newestCloneOfShadowNode.get());
  if (!layoutableShadowNode) {
    return;
  }

  cachedNode.layoutMetrics = layoutableShadowNode->layoutMetrics_;
  cachedNode.viewProps = std::static_pointer_cast<const ViewProps>(
      newestCloneOfShadowNode->getProps());
}

jsi::Value ViewStylesRepository::getPropertyValue(
    jsi::Runtime &rt,
    const folly::dynamic &value,
    const std::vector<std::string> &propertyPath) {
  const folly::dynamic *currentValue = &value;

  for (size_t i = 0; i < propertyPath.size(); ++i) {
    if (currentValue->isNull() || currentValue->empty()) {
      return jsi::Value::undefined();
    }

    const auto &propName = propertyPath[i];

    if (!currentValue->isObject()) {
      return jsi::Value::undefined();
    }

    if (propName == "transform") {
      auto transformIt = currentValue->find("transform");
      if (transformIt == currentValue->items().end()) {
        return jsi::Value::undefined();
      }

      const auto &transform = transformIt->second;
      if (!transform.isArray()) {
        return jsi::Value::undefined();
      }

      if (i + 1 >= propertyPath.size()) {
        return valueFromDynamic(rt, transform);
      }

      const std::string &transformPropName = propertyPath[i + 1];

      for (const auto &transformEntry : transform) {
        if (transformEntry.isObject()) {
          auto transformPropIt = transformEntry.find(transformPropName);
          if (transformPropIt != transformEntry.items().end()) {
            return valueFromDynamic(rt, transformPropIt->second);
          }
        }
      }

      return jsi::Value::undefined();
    }

    auto propIt = currentValue->find(propName);
    if (propIt == currentValue->items().end()) {
      return jsi::Value::undefined();
    }

    currentValue = &propIt->second;
  }

  return valueFromDynamic(rt, *currentValue);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
