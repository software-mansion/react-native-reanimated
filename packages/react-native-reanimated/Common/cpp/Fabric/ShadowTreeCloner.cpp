#ifdef RCT_NEW_ARCH_ENABLED

#include <utility>

#include "ShadowTreeCloner.h"

namespace reanimated {

template<Derived T>
ShadowNode::Unshared cloneShadowTreeWithNewPropsRecursive(
    const ChildrenMap &childrenMap,
    const ShadowNode::Shared &shadowNode,
    const PropsMap<T> &propsMap) {
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
          propsParserContext, newProps, props->getRawProps());
    }
  }

  const auto result = shadowNode->clone(
      {newProps ? newProps : ShadowNodeFragment::propsPlaceholder(),
       std::make_shared<ShadowNode::ListOfShared>(children),
       shadowNode->getState()});

  return result;
}

template<Derived T>
ShadowNode::Unshared cloneShadowTreeWithNewProps(
    const ShadowNode::Shared &oldRootNode,
    const PropsMap<T> &propsMap) {
  ChildrenMap childrenMap;

  for (auto &[family, _] : propsMap) {
    const auto ancestors = family->getAncestors(*oldRootNode);

    for (auto it = ancestors.rbegin(); it != ancestors.rend(); ++it) {
      const auto &parentNode = it->first.get();
      const auto index = it->second;
      const auto parentFamily = &parentNode.getFamily();
      auto &affectedChildren = childrenMap[parentFamily];

      affectedChildren.push_back(index);

      if (affectedChildren.size() > 1) {
        break;
      }
    }
  }

  return cloneShadowTreeWithNewPropsRecursive(
      childrenMap, oldRootNode, propsMap);
}

template ShadowNode::Unshared cloneShadowTreeWithNewProps(
    const ShadowNode::Shared &oldRootNode,
    const PropsMap<JsiValuePropsWrapper> &propsMap);

template ShadowNode::Unshared cloneShadowTreeWithNewProps(
    const ShadowNode::Shared &oldRootNode,
    const PropsMap<FollyDynamicPropsWrapper> &propsMap);

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
