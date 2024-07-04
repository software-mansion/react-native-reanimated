#ifdef RCT_NEW_ARCH_ENABLED

#include <utility>

#include "ShadowTreeCloner.h"

namespace reanimated {

ShadowNode::Unshared cloneShadowTreeWithNewPropsRecursive(
    std::unordered_map<const ShadowNodeFamily *, std::vector<int>> &childrenMap,
    const ShadowNode::Shared &shadowNode,
    std::unordered_map<
        const ShadowNodeFamily *,
        std::vector<std::shared_ptr<RawProps>>> &propsMap) {
  auto family = &shadowNode->getFamily();
  auto children = shadowNode->getChildren();
  auto &affectedChildren = childrenMap[family];

  for (auto index : affectedChildren) {
    children[index] = cloneShadowTreeWithNewPropsRecursive(
        childrenMap, children[index], propsMap);
  }

  Props::Shared newProps = nullptr;

  if (propsMap.contains(family)) {
    PropsParserContext propsParserContext{
        shadowNode->getSurfaceId(), *shadowNode->getContextContainer()};
    newProps = shadowNode->getProps();
    for (auto &props : propsMap[family]) {
      newProps = shadowNode->getComponentDescriptor().cloneProps(
          propsParserContext, newProps, std::move(*props));
    }
  }

  auto result = shadowNode->clone(
      {newProps ? newProps : ShadowNodeFragment::propsPlaceholder(),
       std::make_shared<ShadowNode::ListOfShared>(children),
       shadowNode->getState()});

  return result;
}

ShadowNode::Unshared cloneShadowTreeWithNewProps(
    const ShadowNode::Shared &oldRootNode,
    std::unordered_map<
        const ShadowNodeFamily *,
        std::vector<std::shared_ptr<RawProps>>> &propsMap) {
  std::unordered_map<const ShadowNodeFamily *, std::vector<int>> childrenMap;

  for (auto &[family, _] : propsMap) {
    auto ancestors = family->getAncestors(*oldRootNode);

    for (auto it = ancestors.rbegin(); it != ancestors.rend(); ++it) {
      auto &parentNode = it->first.get();
      auto index = it->second;
      auto parentFamily = &parentNode.getFamily();
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

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
