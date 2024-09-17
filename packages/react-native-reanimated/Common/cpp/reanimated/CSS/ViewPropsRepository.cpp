#include <reanimated/CSS/ViewPropsRepository.h>

namespace reanimated {

ViewPropsRepository &ViewPropsRepository::getInstance() {
  static ViewPropsRepository instance;
  return instance;
}

jsi::Value ViewPropsRepository::getProp(
    jsi::Runtime &runtime,
    const ShadowNode::Shared &shadowNode,
    const std::string &propName) {
  int tag = shadowNode->getTag();

  auto &cachedNode = shadowNodeCache_[tag];
  updateCacheIfNeeded(cachedNode, shadowNode);

  if (propName == "width" || propName == "height" || propName == "top" ||
      propName == "left") {
    const auto &layoutMetrics = cachedNode.layoutMetrics;

    if (propName == "width") {
      return jsi::Value(layoutMetrics.frame.size.width);
    } else if (propName == "height") {
      return jsi::Value(layoutMetrics.frame.size.height);
    } else if (propName == "top") {
      return jsi::Value(layoutMetrics.frame.origin.y);
    } else if (propName == "left") {
      return jsi::Value(layoutMetrics.frame.origin.x);
    }
  } else {
    const auto &viewProps = cachedNode.viewProps;

    if (propName == "opacity") {
      return jsi::Value(viewProps->opacity);
    } else if (propName == "zIndex") {
      return viewProps->zIndex.has_value() ? jsi::Value(*viewProps->zIndex)
                                           : jsi::Value(0);
    } else if (propName == "backgroundColor") {
      return jsi::Value(static_cast<int32_t>(*viewProps->backgroundColor));
    }
  }

  throw std::runtime_error("[Reanimated] Unsupported property: " + propName);
}

jsi::Value ViewPropsRepository::getParentProp(
    jsi::Runtime &rt,
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

  return getProp(rt, parentNode, propName);
}

void ViewPropsRepository::clear() {
  shadowNodeCache_.clear();
}

void ViewPropsRepository::updateCacheIfNeeded(
    CachedShadowNode &cachedNode,
    const ShadowNode::Shared &shadowNode) {
  auto newestCloneOfShadowNode =
      uiManager_->getNewestCloneOfShadowNode(*shadowNode);

  // Check if newestCloneOfShadowNode is valid (is already mounter / not
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

} // namespace reanimated
