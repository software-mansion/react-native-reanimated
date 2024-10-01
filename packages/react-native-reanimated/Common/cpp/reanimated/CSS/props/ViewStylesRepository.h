#pragma once

#include <reanimated/CSS/props/StaticPropsRegistry.h>
#include <reanimated/Fabric/updates/AnimatedPropsRegistry.h>

#include <react/nativemodule/dom/NativeDOM.h>
#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/LayoutableShadowNode.h>
#include <react/renderer/core/ShadowNode.h>
#include <react/renderer/dom/DOM.h>
#include <react/renderer/graphics/Color.h>
#include <react/renderer/uimanager/UIManager.h>

#include <map>
#include <memory>
#include <stdexcept>
#include <string>

using namespace facebook;
using namespace react;

namespace reanimated {

struct CachedShadowNode {
  LayoutMetrics layoutMetrics;
  std::shared_ptr<const ViewProps> viewProps;
};

class ViewStylesRepository {
 public:
  ViewStylesRepository(
      const std::shared_ptr<StaticPropsRegistry> &staticPropsRegistry,
      const std::shared_ptr<AnimatedPropsRegistry> &animatedPropsRegistry);

  void setUIManager(std::shared_ptr<UIManager> uiManager) {
    uiManager_ = uiManager;
  }

  jsi::Value getNodeProp(
      const ShadowNode::Shared &shadowNode,
      const std::string &propName);

  jsi::Value getParentNodeProp(
      const ShadowNode::Shared &shadowNode,
      const std::string &propName);

  jsi::Value getStyleProp(
      jsi::Runtime &rt,
      const Tag tag,
      const std::vector<std::string> &propertyPath);

  void clearNodesCache();

 private:
  std::shared_ptr<UIManager> uiManager_;
  std::shared_ptr<StaticPropsRegistry> staticPropsRegistry_;
  std::shared_ptr<AnimatedPropsRegistry> animatedPropsRegistry_;

  std::map<int, CachedShadowNode> shadowNodeCache_;

  void updateCacheIfNeeded(
      CachedShadowNode &cachedNode,
      const ShadowNode::Shared &shadowNode);

  jsi::Value getPropertyValue(
      jsi::Runtime &rt,
      const folly::dynamic &value,
      const std::vector<std::string> &propertyPath);
};

} // namespace reanimated
