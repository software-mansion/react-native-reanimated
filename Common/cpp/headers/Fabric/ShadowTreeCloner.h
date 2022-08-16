#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <react/renderer/core/PropsParserContext.h>
#include <react/renderer/uimanager/UIManager.h>

#include <memory>
#include <set>

#include "NewestShadowNodesRegistry.h"

using namespace facebook;
using namespace react;

namespace reanimated {

class ShadowTreeCloner {
 public:
  ShadowTreeCloner(
      std::shared_ptr<NewestShadowNodesRegistry> newestShadowNodesRegistry,
      std::shared_ptr<UIManager> uiManager,
      SurfaceId surfaceId);

  ~ShadowTreeCloner();

  ShadowNode::Unshared cloneWithNewProps(
      const ShadowNode::Shared &oldRootNode,
      const ShadowNodeFamily &family,
      RawProps &&rawProps);

  void updateYogaChildren();

 private:
  PropsParserContext propsParserContext_;
  std::shared_ptr<NewestShadowNodesRegistry> newestShadowNodesRegistry_;
  std::set<ShadowNode *> yogaChildrenUpdates_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
