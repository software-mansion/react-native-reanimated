#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <react/renderer/core/PropsParserContext.h>
#include <react/renderer/uimanager/UIManager.h>

#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace reanimated {

using PropsMap = std::unordered_map<
    const facebook::react::ShadowNodeFamily *,
    std::vector<facebook::react::RawProps>>;
using ChildrenMap = std::unordered_map<
    const facebook::react::ShadowNodeFamily *,
    std::unordered_set<int>>;

facebook::react::RootShadowNode::Unshared cloneShadowTreeWithNewProps(
    const facebook::react::RootShadowNode &oldRootNode,
    const PropsMap &propsMap);

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
