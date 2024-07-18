#ifdef RCT_NEW_ARCH_ENABLED

#include <ranges>
#include <utility>

#include "ShadowTreeCloner.h"

namespace reanimated {

ShadowNode::Unshared cloneShadowTreeWithNewPropsRecursive(
    const ChildrenMap &childrenMap,
    const ShadowNode::Shared &shadowNode,
    const PropsMap &propsMap) {
  const auto family = &shadowNode->getFamily();
  const auto affectedChildrenIt = childrenMap.find(family);
  const auto propsIt = propsMap.find(family);
  auto children = shadowNode->getChildren();

  if (affectedChildrenIt != childrenMap.end()) {
    for (const auto index : affectedChildrenIt->second) {
      children[index] = cloneShadowTreeWithNewPropsRecursive(
          childrenMap, children[index], propsMap);
    }
  }

  Props::Shared newProps = nullptr;

  if (propsIt != propsMap.end()) {
    PropsParserContext propsParserContext{
        shadowNode->getSurfaceId(), *shadowNode->getContextContainer()};
    newProps = shadowNode->getProps();
    for (const auto &props : propsIt->second) {
      newProps = shadowNode->getComponentDescriptor().cloneProps(
          propsParserContext, newProps, RawProps(props));
    }
  }

  const auto result = shadowNode->clone(
      {newProps ? newProps : ShadowNodeFragment::propsPlaceholder(),
       std::make_shared<ShadowNode::ListOfShared>(children),
       shadowNode->getState()});

  return result;
}

ShadowNode::Unshared cloneShadowTreeWithNewProps(
    const ShadowNode::Shared &oldRootNode,
    const PropsMap &propsMap) {
  ChildrenMap childrenMap;

  for (auto &[family, _] : propsMap) {
    const auto ancestors = family->getAncestors(*oldRootNode);

    for (const auto &[parentNode, index] :
         std::ranges::reverse_view(ancestors)) {
      const auto parentFamily = &parentNode.get().getFamily();
      auto &affectedChildren = childrenMap[parentFamily];

      if (affectedChildren.contains(index)) {
        continue;
      }

      affectedChildren.insert(index);
    }
  }

  return cloneShadowTreeWithNewPropsRecursive(
      childrenMap, oldRootNode, propsMap);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
