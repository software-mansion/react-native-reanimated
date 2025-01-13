#ifdef RCT_NEW_ARCH_ENABLED

#include <react/renderer/core/DynamicPropsUtilities.h>
#include <reanimated/Fabric/ShadowTreeCloner.h>

#include <ranges>
#include <utility>

namespace reanimated {

ChildrenMap calculateChildrenMap(
    const RootShadowNode &oldRootNode,
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
  return childrenMap;
}

ShadowNode::Unshared cloneShadowTreeWithNewPropsRecursive(
    const ShadowNode &shadowNode,
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

  Props::Shared newProps = nullptr;

  if (propsIt != propsMap.end()) {
    PropsParserContext propsParserContext{
        shadowNode.getSurfaceId(), *shadowNode.getContextContainer()};
    newProps = shadowNode.getProps();
    for (const auto &props : propsIt->second) {
      newProps = shadowNode.getComponentDescriptor().cloneProps(
          propsParserContext, newProps, RawProps(props));
    }
  }

  const auto result = shadowNode.clone(
      {newProps ? newProps : ShadowNodeFragment::propsPlaceholder(),
       std::make_shared<ShadowNode::ListOfShared>(children),
       shadowNode.getState()});

  return result;
}

ShadowNode::Unshared cloneShadowTreeWithNewPropsUnmountedRecursive(
    ShadowNode::Shared const &oldShadowNode,
    const ChildrenMap &childrenMap,
    const PropsMap &propsMap) {
  if (oldShadowNode->getHasBeenPromoted()) {
    return cloneShadowTreeWithNewPropsRecursive(
        *oldShadowNode, childrenMap, propsMap);
  }

  auto shadowNode = std::const_pointer_cast<ShadowNode>(oldShadowNode);
  auto layoutableShadowNode =
      std::dynamic_pointer_cast<LayoutableShadowNode>(shadowNode);
  if (layoutableShadowNode) {
    layoutableShadowNode->dirtyLayout();
  }

  const auto family = &shadowNode->getFamily();
  const auto affectedChildrenIt = childrenMap.find(family);
  const auto propsIt = propsMap.find(family);
  auto children = shadowNode->getChildren();

  if (affectedChildrenIt != childrenMap.end()) {
    for (const auto index : affectedChildrenIt->second) {
      auto clone = cloneShadowTreeWithNewPropsUnmountedRecursive(
          children[index], childrenMap, propsMap);
      if (clone != children[index]) {
        shadowNode->replaceChild(*children[index], clone, index);
      }
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

  if (newProps) {
    auto &props = shadowNode->getProps();
    auto &mutableProps = const_cast<Props::Shared &>(props);

#ifdef ANDROID
    auto &newPropsRef = const_cast<Props &>(*newProps);
    newPropsRef.rawProps = mergeDynamicProps(
        mutableProps->rawProps,
        newProps->rawProps,
        NullValueStrategy::Override);
#endif
    mutableProps = newProps;
    auto layoutableShadowNode =
        static_pointer_cast<YogaLayoutableShadowNode>(shadowNode);
    layoutableShadowNode->updateYogaProps();
  }

  return shadowNode;
}

RootShadowNode::Unshared cloneShadowTreeWithNewProps(
    const RootShadowNode &oldRootNode,
    const PropsMap &propsMap) {
  auto childrenMap = calculateChildrenMap(oldRootNode, propsMap);

  // This cast is safe, because this function returns a clone
  // of the oldRootNode, which is an instance of RootShadowNode
  return std::static_pointer_cast<RootShadowNode>(
      cloneShadowTreeWithNewPropsRecursive(oldRootNode, childrenMap, propsMap));
}

RootShadowNode::Unshared cloneShadowTreeWithNewPropsUnmounted(
    RootShadowNode::Unshared const &oldRootNode,
    const PropsMap &propsMap) {
  auto childrenMap = calculateChildrenMap(*oldRootNode, propsMap);

  // This cast is safe, because this function returns a clone
  // of the oldRootNode, which is an instance of RootShadowNode
  return std::static_pointer_cast<RootShadowNode>(
      cloneShadowTreeWithNewPropsUnmountedRecursive(
          oldRootNode, childrenMap, propsMap));
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
