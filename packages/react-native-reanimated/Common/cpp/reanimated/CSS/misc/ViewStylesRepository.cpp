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
  const auto resolvedNode = getNewestNode(shadowNode);
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
  // Resolve shadowNode against the last mounted root instead of reading the live
  // ShadowTree: uiManager_->getNewestCloneOfShadowNode takes the ShadowTree commit
  // lock, and this method runs under the updates-registry lock while a concurrent
  // Fabric commit takes the same two locks in the opposite order (the ANR
  // deadlock). Falls back to the passed node. Mirrors RN's getShadowNodeInSubtree:
  // https://github.com/facebook/react-native/blob/v0.86.0-rc.3/packages/react-native/ReactCommon/react/renderer/uimanager/UIManager.cpp#L339
  RootShadowNode::Shared root;
  {
    const std::lock_guard<std::mutex> lock{lastMountedRootMutex_};
    const auto it = lastMountedRootBySurface_.find(shadowNode->getSurfaceId());
    if (it == lastMountedRootBySurface_.end()) {
      return shadowNode;
    }
    root = it->second;
  }

  if (ShadowNode::sameFamily(*root, *shadowNode)) {
    return root;
  }

  const auto ancestors = shadowNode->getFamily().getAncestors(*root);
  if (ancestors.empty()) {
    return shadowNode;
  }

  const auto &deepest = ancestors.back();
  return deepest.first.get().getChildren().at(deepest.second);
}

std::shared_ptr<const ShadowNode> ViewStylesRepository::getParentNode(
    const std::shared_ptr<const ShadowNode> &shadowNode) const {
  RootShadowNode::Shared root;
  {
    const std::lock_guard<std::mutex> lock{lastMountedRootMutex_};
    const auto it = lastMountedRootBySurface_.find(shadowNode->getSurfaceId());
    if (it == lastMountedRootBySurface_.end()) {
      return nullptr;
    }
    root = it->second;
  }
  return dom::getParentNode(root, *shadowNode);
}

void ViewStylesRepository::setLastMountedRoot(const RootShadowNode::Shared &rootShadowNode) {
  const std::lock_guard<std::mutex> lock{lastMountedRootMutex_};
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
