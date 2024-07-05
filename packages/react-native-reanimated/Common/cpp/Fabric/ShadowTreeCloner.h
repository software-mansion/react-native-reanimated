#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <react/renderer/core/PropsParserContext.h>
#include <react/renderer/uimanager/UIManager.h>

#include <memory>
#include <unordered_map>
#include <vector>

using namespace facebook;
using namespace react;

namespace reanimated {

using PropsMap = std::unordered_map<const ShadowNodeFamily *, std::vector<std::shared_ptr<RawProps>>>;
using ChildrenMap = std::unordered_map<const ShadowNodeFamily *, std::vector<int>>;

ShadowNode::Unshared cloneShadowTreeWithNewProps(
    const ShadowNode::Shared &oldRootNode,
    PropsMap &propsMap);

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
