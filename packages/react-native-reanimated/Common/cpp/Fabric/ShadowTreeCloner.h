#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <react/renderer/core/PropsParserContext.h>
#include <react/renderer/uimanager/UIManager.h>

#include <type_traits>
#include <memory>
#include <unordered_map>
#include <vector>

#include "PropsWrapper.h"

using namespace facebook;
using namespace react;

namespace reanimated {

template<class T>
concept Derived = std::is_base_of_v<PropsWrapper, T>;

template<Derived T>
using PropsMap = std::unordered_map<const ShadowNodeFamily *, std::vector<std::unique_ptr<T>>>;

using ChildrenMap = std::unordered_map<const ShadowNodeFamily *, std::vector<int>>;

template<Derived T>
ShadowNode::Unshared cloneShadowTreeWithNewProps(
    const ShadowNode::Shared &oldRootNode,
    const PropsMap<T> &propsMap);

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
