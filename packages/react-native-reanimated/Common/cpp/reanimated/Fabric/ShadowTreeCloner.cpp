#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/Fabric/ShadowTreeCloner.h>

#include <ranges>
#include <utility>

#include <memory>

namespace reanimated {

facebook::react::ShadowNode::Unshared cloneShadowTreeWithNewPropsRecursive(
    const facebook::react::ShadowNode &shadowNode,
    const ChildrenMap &childrenMap,
    const PropsMap &propsMap) {
  const auto family = &shadowNode.getFamily();
  const auto affectedChildrenIt = childrenMap.find(family);
  const auto propsIt = propsMap.find(family);
  auto children = shadowNode.getChildren();

  if (affectedChildrenIt != childrenMap.end()) {
    for (const auto index : affectedChildrenIt->second) {
      children[index] = cloneShadowTreeWithNewPropsRecursive(
          *children[index], childrenMap, propsMap);
    }
  }

  facebook::react::Props::Shared newProps = nullptr;

  if (propsIt != propsMap.end()) {
    facebook::react::PropsParserContext propsParserContext{
        shadowNode.getSurfaceId(), *shadowNode.getContextContainer()};
    newProps = shadowNode.getProps();
    for (const auto &props : propsIt->second) {
      newProps = shadowNode.getComponentDescriptor().cloneProps(
          propsParserContext, newProps, facebook::react::RawProps(props));
    }
  }

  const auto result = shadowNode.clone(
      {newProps ? newProps
                : facebook::react::ShadowNodeFragment::propsPlaceholder(),
       std::make_shared<facebook::react::ShadowNode::ListOfShared>(children),
       shadowNode.getState()});

  return result;
}

facebook::react::RootShadowNode::Unshared cloneShadowTreeWithNewProps(
    const facebook::react::RootShadowNode &oldRootNode,
    const PropsMap &propsMap) {
  ChildrenMap childrenMap;

  for (auto &[family, _] : propsMap) {
    const auto ancestors = family->getAncestors(oldRootNode);

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

  // This cast is safe, because this function returns a clone
  // of the oldRootNode, which is an instance of RootShadowNode
  return std::static_pointer_cast<facebook::react::RootShadowNode>(
      cloneShadowTreeWithNewPropsRecursive(oldRootNode, childrenMap, propsMap));
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
