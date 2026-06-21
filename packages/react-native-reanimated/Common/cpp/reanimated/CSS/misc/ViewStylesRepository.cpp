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
  // Resolve against the freshly mounted node (recorded by the mount hook); before the
  // first mount snapshots this surface, or for a removed node, fall back to the passed
  // node, which still carries its last layout.
  const auto newestNode = getNewestNode(shadowNode);
  const auto &resolvedNode = newestNode ? newestNode : shadowNode;
  const auto *layoutableShadowNode = dynamic_cast<const LayoutableShadowNode *>(resolvedNode.get());

  if (propName == "width" || propName == "height" || propName == "top" || propName == "left") {
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
    const auto viewProps = std::static_pointer_cast<const ViewProps>(resolvedNode->getProps());
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
  // Same walk as RN's UIManager::getShadowNodeInSubtree (which is private): find this
  // family's node inside the given root. We resolve against the last mounted root
  // rather than the live tree so we never take the ShadowTree lock that the public
  // getNewestCloneOfShadowNode would (the AB-BA deadlock with Fabric commits).
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
