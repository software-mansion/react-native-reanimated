#pragma once

#include <folly/dynamic.h>
#include <react/renderer/uimanager/UIManager.h>
#include <reanimated/Compat/ReactNativeRendererCore.h>

#include <unordered_map>
#include <unordered_set>
#include <vector>

using namespace facebook;
using namespace react;

namespace reanimated {

using PropsMap = std::unordered_map<ShadowNodeFamily::Shared, std::vector<folly::dynamic>>;

RootShadowNode::Unshared cloneShadowTreeWithNewProps(const RootShadowNode &oldRootNode, const PropsMap &propsMap);

} // namespace reanimated
