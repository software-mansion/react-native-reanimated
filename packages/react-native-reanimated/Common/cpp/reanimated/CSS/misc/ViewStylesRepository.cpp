#include <reanimated/CSS/misc/ViewStylesRepository.h>

#include <memory>
#include <string>

namespace reanimated::css {

ViewStylesRepository::ViewStylesRepository(
    const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
    const std::shared_ptr<AnimatedPropsRegistry> &animatedPropsRegistry)
    : staticPropsRegistry_(staticPropsRegistry), animatedPropsRegistry_(animatedPropsRegistry) {}

jsi::Value ViewStylesRepository::getNodeProp(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::string &propName) {
  // Resolve against the last mounted tree (captured by the mount hook) rather
  // than the live ShadowTree. This avoids taking the ShadowTree revision lock
  // here, which would deadlock against a Fabric commit that holds it and waits
  // for the updates-registry lock we are holding.
  const auto newestNode = getNewestNode(shadowNode);
  const auto *layoutableShadowNode =
      newestNode ? dynamic_cast<const LayoutableShadowNode *>(newestNode.get()) : nullptr;

  if (propName == "width" || propName == "height" || propName == "top" || propName == "left") {
    // The node can be missing from the last mounted tree while its CSS animation
    // is still flushing: on unmount the view is only marked removable and the
    // animation stays registered until handleNodeRemovals prunes it at the next
    // non-Reanimated mount. Resolve relative lengths against a zero frame in that
    // window; returning a number (not undefined) keeps resolve() from returning
    // nullopt, which would make relative transform ops (translateX/Y %,
    // transformOrigin %) throw.
    const auto layoutMetrics = layoutableShadowNode ? layoutableShadowNode->layoutMetrics_ : LayoutMetrics{};

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
    if (!layoutableShadowNode) {
      return jsi::Value::undefined();
    }
    const auto viewProps = std::static_pointer_cast<const ViewProps>(newestNode->getProps());
    if (!viewProps) {
      return jsi::Value::undefined();
    }

    if (propName == "opacity") {
      return {viewProps->opacity};
    } else if (propName == "zIndex") {
      return viewProps->zIndex.has_value() ? jsi::Value(*viewProps->zIndex) : jsi::Value(0);
    } else if (propName == "backgroundColor") {
      return {static_cast<int32_t>(*viewProps->backgroundColor)};
    }
  }

  throw std::runtime_error("[Reanimated] Unsupported property: " + propName);
}

jsi::Value ViewStylesRepository::getParentNodeProp(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::string &propName) {
  const auto parentNode = getParentNode(shadowNode);

  if (!parentNode) {
    return jsi::Value::undefined();
  }

  return getNodeProp(parentNode, propName);
}

std::shared_ptr<const ShadowNode> ViewStylesRepository::getNewestNode(
    const std::shared_ptr<const ShadowNode> &shadowNode) const {
  const auto it = lastMountedRootBySurface_.find(shadowNode->getSurfaceId());
  if (it == lastMountedRootBySurface_.end()) {
    return nullptr;
  }
  const auto &root = it->second;

  if (ShadowNode::sameFamily(*root, *shadowNode)) {
    return root;
  }

  const auto ancestors = shadowNode->getFamily().getAncestors(*root);
  if (ancestors.empty()) {
    return nullptr;
  }

  const auto &deepest = ancestors.back();
  return deepest.first.get().getChildren().at(deepest.second);
}

std::shared_ptr<const ShadowNode> ViewStylesRepository::getParentNode(
    const std::shared_ptr<const ShadowNode> &shadowNode) const {
  const auto it = lastMountedRootBySurface_.find(shadowNode->getSurfaceId());
  if (it == lastMountedRootBySurface_.end()) {
    return nullptr;
  }
  return dom::getParentNode(it->second, *shadowNode);
}

void ViewStylesRepository::setLastMountedRoot(const RootShadowNode::Shared &rootShadowNode) {
  lastMountedRootBySurface_[rootShadowNode->getSurfaceId()] = rootShadowNode;
}

folly::dynamic ViewStylesRepository::getStyleProp(const Tag tag, const PropertyPath &propertyPath) {
  auto animatedValue = getPropertyValue(animatedPropsRegistry_->get(tag), propertyPath);
  if (!animatedValue.isNull()) {
    return animatedValue;
  }

  return getPropertyValue(staticPropsRegistry_->get(tag), propertyPath);
}

folly::dynamic ViewStylesRepository::getPropertyValue(const folly::dynamic &value, const PropertyPath &propertyPath) {
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
