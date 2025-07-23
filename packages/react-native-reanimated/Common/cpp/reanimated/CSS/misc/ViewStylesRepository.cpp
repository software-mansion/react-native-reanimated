#include <reanimated/CSS/misc/ViewStylesRepository.h>

namespace reanimated::css {

ViewStylesRepository::ViewStylesRepository(
    const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
    const std::shared_ptr<AnimatedPropsRegistry> &animatedPropsRegistry)
    : staticPropsRegistry_(staticPropsRegistry),
      animatedPropsRegistry_(animatedPropsRegistry) {}

jsi::Value ViewStylesRepository::getNodeProp(
    const std::shared_ptr<const ShadowNode> &shadowNode,
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
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::string &propName) {
  const auto surfaceId = shadowNode->getSurfaceId();
  const auto &shadowTreeRegistry = uiManager_->getShadowTreeRegistry();

  std::shared_ptr<const ShadowNode> parentNode = nullptr;

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

folly::dynamic ViewStylesRepository::getStyleProp(
    const Tag tag,
    const PropertyPath &propertyPath) {
  auto animatedValue =
      getPropertyValue(animatedPropsRegistry_->get(tag), propertyPath);
  if (!animatedValue.isNull()) {
    return animatedValue;
  }

  return getPropertyValue(staticPropsRegistry_->get(tag), propertyPath);
}

void ViewStylesRepository::clearNodesCache() {
  shadowNodeCache_.clear();
}

void ViewStylesRepository::updateCacheIfNeeded(
    CachedShadowNode &cachedNode,
    const std::shared_ptr<const ShadowNode> &shadowNode) {
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

folly::dynamic ViewStylesRepository::getPropertyValue(
    const folly::dynamic &value,
    const PropertyPath &propertyPath) {
  const folly::dynamic *currentValue = &value;

  for (size_t i = 0; i < propertyPath.size(); ++i) {
    if (currentValue->isNull() || currentValue->empty()) {
      return {};
    }

    const auto &propName = propertyPath[i];

    if (!currentValue->isObject()) {
      return {};
    }

    if (propName == "transform") {
      auto transformIt = currentValue->find("transform");
      if (transformIt == currentValue->items().end()) {
        return {};
      }

      const auto &transform = transformIt->second;
      if (!transform.isArray()) {
        return {};
      }

      if (i + 1 >= propertyPath.size()) {
        return transform;
      }

      const std::string &transformPropName = propertyPath[i + 1];

      for (const auto &transformEntry : transform) {
        if (transformEntry.isObject()) {
          auto transformPropIt = transformEntry.find(transformPropName);
          if (transformPropIt != transformEntry.items().end()) {
            return transformPropIt->second;
          }
        }
      }

      return {};
    }

    auto propIt = currentValue->find(propName);
    if (propIt == currentValue->items().end()) {
      return {};
    }

    currentValue = &propIt->second;
  }

  return *currentValue;
}

} // namespace reanimated::css
