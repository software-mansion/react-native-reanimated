#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/registry/StaticPropsRegistry.h>
#include <reanimated/Fabric/updates/AnimatedPropsRegistry.h>

#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/LayoutableShadowNode.h>
#include <react/renderer/dom/DOM.h>

#include <map>
#include <memory>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <vector>

namespace reanimated::css {

using namespace facebook;
using namespace react;

struct CachedShadowNode {
  LayoutMetrics layoutMetrics;
  std::shared_ptr<const ViewProps> viewProps;
};

class ViewStylesRepository {
 public:
  ViewStylesRepository(
      const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
      const std::shared_ptr<AnimatedPropsRegistry> &animatedPropsRegistry);

  void setUIManager(const std::shared_ptr<UIManager> &uiManager) {
    uiManager_ = uiManager;
  }

  jsi::Value getNodeProp(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::string &propName);
  jsi::Value getParentNodeProp(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::string &propName);
  folly::dynamic getStyleProp(Tag tag, const PropertyPath &propertyPath);

  void clearNodesCache();

 private:
  std::shared_ptr<UIManager> uiManager_;
  std::shared_ptr<StaticPropsRegistry> staticPropsRegistry_;
  std::shared_ptr<AnimatedPropsRegistry> animatedPropsRegistry_;

  std::unordered_map<int, CachedShadowNode> shadowNodeCache_;

  void updateCacheIfNeeded(
      CachedShadowNode &cachedNode,
      const std::shared_ptr<const ShadowNode> &shadowNode);

  static folly::dynamic getPropertyValue(
      const folly::dynamic &value,
      const PropertyPath &propertyPath);
};

} // namespace reanimated::css
