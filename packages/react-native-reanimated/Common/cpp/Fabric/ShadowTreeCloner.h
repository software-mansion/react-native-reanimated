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

ShadowNode::Unshared cloneShadowTreeWithNewProps(
    const ShadowNode::Shared &oldRootNode,
    std::unordered_map<
        const ShadowNodeFamily *,
        std::vector<std::shared_ptr<RawProps>>> &propsMap);

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
