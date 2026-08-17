#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/registries/StaticPropsRegistry.h>
#include <reanimated/Fabric/updates/AnimatedPropsRegistry.h>

#include <react/renderer/components/root/RootShadowNode.h>
#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/LayoutableShadowNode.h>
#include <react/renderer/dom/DOM.h>
#include <react/renderer/uimanager/UIManager.h>

#include <memory>
#include <string>
#include <unordered_map>

namespace reanimated::css {

using namespace facebook;
using namespace react;

class ViewStylesRepository {
 public:
  ViewStylesRepository(
      const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
      const std::shared_ptr<AnimatedPropsRegistry> &animatedPropsRegistry);

  void setUIManager(const std::shared_ptr<UIManager> &uiManager) {
    uiManager_ = uiManager;
  }

  jsi::Value getNodeProp(const std::shared_ptr<const ShadowNode> &shadowNode, const std::string &propName);
  jsi::Value getParentNodeProp(const std::shared_ptr<const ShadowNode> &shadowNode, const std::string &propName);
  folly::dynamic getStyleProp(Tag tag, const PropertyPath &propertyPath);

  void setLastMountedRoot(const RootShadowNode::Shared &rootShadowNode);

 private:
  std::shared_ptr<UIManager> uiManager_;
  std::shared_ptr<StaticPropsRegistry> staticPropsRegistry_;
  std::shared_ptr<AnimatedPropsRegistry> animatedPropsRegistry_;

  std::unordered_map<SurfaceId, RootShadowNode::Shared> lastMountedRootBySurface_;

  std::shared_ptr<const ShadowNode> getNewestNode(const std::shared_ptr<const ShadowNode> &shadowNode) const;
  std::shared_ptr<const ShadowNode> getParentNode(const std::shared_ptr<const ShadowNode> &shadowNode) const;

  static folly::dynamic getPropertyValue(const folly::dynamic &value, const PropertyPath &propertyPath);
};

} // namespace reanimated::css
