#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>

#include <ranges>
#include <utility>

namespace reanimated {

/**
 * Checks it the props of a are identical to the props in b.
 * Doesn't mean they are deeply the same, just that b has everything that a has.
 */
bool checkPropsEqual(const folly::dynamic& a, const folly::dynamic& b) {
    for (const auto& pair : a.items()) {
        const auto& key = pair.first;
        auto it = b.find(key);
        if (it == b.items().end()) {
            return false; // Key from A not found in B
        }

        const auto& valueA = pair.second;
        const auto& valueB = it->second;

        if (valueA != valueB) {
            return false;
        }
    }

    return true;
}

Props::Shared mergeProps(
    const ShadowNode &shadowNode,
    const PropsMap &propsMap,
    const ShadowNodeFamily &family) {
  ReanimatedSystraceSection s("ShadowTreeCloner::mergeProps");

  const auto it = propsMap.find(&family);

  if (it == propsMap.end()) {
    return ShadowNodeFragment::propsPlaceholder();
  }

  PropsParserContext propsParserContext{
      shadowNode.getSurfaceId(), *shadowNode.getContextContainer()};
  const auto &propsVector = it->second;
  auto newProps = shadowNode.getProps();

#ifdef ANDROID
  if (propsVector.size() > 1) {
    folly::dynamic newPropsDynamic = folly::dynamic::object;
    for (const auto &props : propsVector) {
      newPropsDynamic = folly::dynamic::merge(
          props.operator folly::dynamic(), newPropsDynamic);
    }
    return shadowNode.getComponentDescriptor().cloneProps(
        propsParserContext, newProps, RawProps(newPropsDynamic));
  }
#endif

  for (const auto &props : propsVector) {
    newProps = shadowNode.getComponentDescriptor().cloneProps(
        propsParserContext, newProps, RawProps(props));
  }

  return newProps;
}

ShadowNode::Unshared cloneShadowTreeWithNewPropsRecursive(
    const ShadowNode &shadowNode,
    const ChildrenMap &childrenMap,
    const PropsMap &propsMap,
    std::vector<Tag>& tagsToRemove) {
  const auto family = &shadowNode.getFamily();
  const auto affectedChildrenIt = childrenMap.find(family);
  auto children = shadowNode.getChildren();

  if (affectedChildrenIt != childrenMap.end()) {
    for (const auto index : affectedChildrenIt->second) {
      children[index] = cloneShadowTreeWithNewPropsRecursive(
          *children[index], childrenMap, propsMap, tagsToRemove);
    }
  }

  const auto newProps = mergeProps(shadowNode, propsMap, *family);

 if (newProps) {
     ReanimatedSystraceSection s("ShadowTreeCloner::equalityCheck");

     const auto& shadowNodeProps = shadowNode.getProps()->rawProps;
     const auto& newPropsDynamic = newProps->rawProps;
     bool isSame = newPropsDynamic == shadowNodeProps ||
              checkPropsEqual(newPropsDynamic, shadowNodeProps);

     if (isSame) {
         tagsToRemove.push_back(shadowNode.getTag());
     }
 }

  return shadowNode.clone(
      {newProps,
       std::make_shared<ShadowNode::ListOfShared>(children),
       shadowNode.getState(),
       false});
}

RootShadowNode::Unshared cloneShadowTreeWithNewProps(
    const RootShadowNode &oldRootNode,
    const PropsMap &propsMap,
    std::vector<Tag>& tagsToRemove) {
  ReanimatedSystraceSection s("ShadowTreeCloner::cloneShadowTreeWithNewProps");

  ChildrenMap childrenMap;

  {
    ReanimatedSystraceSection s1("ShadowTreeCloner::prepareChildrenMap");

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
  }

  // This cast is safe, because this function returns a clone
  // of the oldRootNode, which is an instance of RootShadowNode
  return std::static_pointer_cast<RootShadowNode>(
      cloneShadowTreeWithNewPropsRecursive(oldRootNode, childrenMap, propsMap, tagsToRemove));
}

} // namespace reanimated
