#pragma once

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

class ViewPropsRepository {
 public:
  ViewPropsRepository(const ViewPropsRepository &) = delete;
  ViewPropsRepository &operator=(const ViewPropsRepository &) = delete;

  static ViewPropsRepository &getInstance();

  void setUIManager(std::shared_ptr<UIManager> uiManager) {
    uiManager_ = uiManager;
  }

  jsi::Value getProp(
      jsi::Runtime &runtime,
      const ShadowNode::Shared &shadowNode,
      const std::string &propName);

  jsi::Value getParentProp(
      jsi::Runtime &runtime,
      const ShadowNode::Shared &shadowNode,
      const std::string &propName);

  void clear();

 private:
  ViewPropsRepository() = default;

  struct CachedShadowNode {
    LayoutMetrics layoutMetrics;
    std::shared_ptr<const ViewProps> viewProps;
  };

  std::map<int, CachedShadowNode> shadowNodeCache_;
  std::shared_ptr<UIManager> uiManager_;

  void updateCacheIfNeeded(
      CachedShadowNode &cachedNode,
      const ShadowNode::Shared &shadowNode);
};

} // namespace reanimated
