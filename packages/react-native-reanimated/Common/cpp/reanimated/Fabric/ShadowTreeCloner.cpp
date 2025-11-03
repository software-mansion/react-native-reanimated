#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <reanimated/Tools/FeatureFlags.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>

#include <chrono>
#include <memory>
#include <ranges>
#include <utility>

namespace reanimated {

Props::Shared mergeProps(const ShadowNode &shadowNode, const PropsMap &propsMap, const ShadowNodeFamily &family) {
  ReanimatedSystraceSection s("ShadowTreeCloner::mergeProps");

  const auto it = propsMap.find(&family);

  if (it == propsMap.end()) {
    return ShadowNodeFragment::propsPlaceholder();
  }

  PropsParserContext propsParserContext{shadowNode.getSurfaceId(), *shadowNode.getContextContainer()};
  const auto &propsVector = it->second;
  auto newProps = shadowNode.getProps();

#ifdef ANDROID
  if (propsVector.size() > 1) {
    folly::dynamic newPropsDynamic = folly::dynamic::object;
    for (const auto &props : propsVector) {
      newPropsDynamic = folly::dynamic::merge(props.operator folly::dynamic(), newPropsDynamic);
    }
    return shadowNode.getComponentDescriptor().cloneProps(propsParserContext, newProps, RawProps(newPropsDynamic));
  }
#endif

  for (const auto &props : propsVector) {
    newProps = shadowNode.getComponentDescriptor().cloneProps(propsParserContext, newProps, RawProps(props));
  }

  return newProps;
}

std::shared_ptr<ShadowNode> cloneShadowTreeWithNewPropsRecursive(
    const ShadowNode &shadowNode,
    const ChildrenMap &childrenMap,
    const PropsMap &propsMap,
    int &cloneCount) {
  const auto family = &shadowNode.getFamily();
  const auto affectedChildrenIt = childrenMap.find(family);
  auto children = shadowNode.getChildren();

  if (affectedChildrenIt != childrenMap.end()) {
    for (const auto index : affectedChildrenIt->second) {
      children[index] = cloneShadowTreeWithNewPropsRecursive(*children[index], childrenMap, propsMap, cloneCount);
    }
  }

  cloneCount++;
  return shadowNode.clone(
      {mergeProps(shadowNode, propsMap, *family),
       std::make_shared<std::vector<std::shared_ptr<const ShadowNode>>>(children),
       shadowNode.getState(),
       false});
}

RootShadowNode::Unshared cloneShadowTreeWithNewProps(const RootShadowNode &oldRootNode, const PropsMap &propsMap) {
  ReanimatedSystraceSection s("ShadowTreeCloner::cloneShadowTreeWithNewProps");

  const auto start = std::chrono::high_resolution_clock::now();

  ChildrenMap childrenMap;

  {
    ReanimatedSystraceSection s("ShadowTreeCloner::prepareChildrenMap");

    for (auto &[family, _] : propsMap) {
      const auto ancestors = family->getAncestors(oldRootNode);

      for (const auto &[parentNode, index] : std::ranges::reverse_view(ancestors)) {
        const auto parentFamily = &parentNode.get().getFamily();
        auto &affectedChildren = childrenMap[parentFamily];

        if (affectedChildren.contains(index)) {
          continue;
        }

        affectedChildren.insert(index);
      }
    }
  }
  
  int cloneCount = 0;

  // This cast is safe, because this function returns a clone
  // of the oldRootNode, which is an instance of RootShadowNode
  const auto result = std::static_pointer_cast<RootShadowNode>(
      cloneShadowTreeWithNewPropsRecursive(oldRootNode, childrenMap, propsMap, cloneCount));

  if constexpr (StaticFeatureFlags::getFlag("VERBOSE_MODE")) {
    const auto end = std::chrono::high_resolution_clock::now();
    const auto duration_ms = std::chrono::duration<double>(end - start).count() * 1000;
    LOG(INFO) << "cloneShadowTreeWithNewProps count=" << cloneCount << " duration=" << duration_ms << "ms";
  }

  return result;
}

} // namespace reanimated
