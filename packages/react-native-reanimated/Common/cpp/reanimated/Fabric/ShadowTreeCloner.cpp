#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>

#include <cstring>
#include <memory>
#include <ranges>
#include <string>
#include <utility>

namespace reanimated {

namespace {

bool isTextComponent(const ShadowNode &shadowNode) {
  return !strcmp(shadowNode.getComponentName(), "Paragraph") || !strcmp(shadowNode.getComponentName(), "Text");
}

std::shared_ptr<const ShadowNode> cloneRawTextWithNewText(const ShadowNode &rawTextNode, const std::string &text) {
  PropsParserContext propsParserContext{rawTextNode.getSurfaceId(), *rawTextNode.getContextContainer()};
  auto newProps = rawTextNode.getComponentDescriptor().cloneProps(
      propsParserContext, rawTextNode.getProps(), RawProps(folly::dynamic::object("text", text)));
  return rawTextNode.clone({newProps, ShadowNodeFragment::childrenPlaceholder(), rawTextNode.getState()});
}

} // namespace

Props::Shared mergeProps(
    const ShadowNode &shadowNode,
    const std::vector<RawProps> &propsVector,
    std::vector<std::shared_ptr<const ShadowNode>> &children) {
  ReanimatedSystraceSection s("ShadowTreeCloner::mergeProps");

  auto newPropsDynamic = propsVector.front().toDynamic();
  for (const auto &props : propsVector | std::views::drop(1)) {
    newPropsDynamic.update(props.toDynamic());
  }

  if (isTextComponent(shadowNode)) {
    if (const auto *childrenProp = newPropsDynamic.get_ptr("children")) {
      if ((childrenProp->isString() || childrenProp->isNumber()) && !children.empty()) {
        children[0] = cloneRawTextWithNewText(*children[0], childrenProp->asString());
      }
      newPropsDynamic.erase("children");
    }
  }

  if (newPropsDynamic.empty()) {
    return ShadowNodeFragment::propsPlaceholder();
  }

  PropsParserContext propsParserContext{shadowNode.getSurfaceId(), *shadowNode.getContextContainer()};
  return shadowNode.getComponentDescriptor().cloneProps(
      propsParserContext, shadowNode.getProps(), RawProps(std::move(newPropsDynamic)));
}

std::shared_ptr<ShadowNode> cloneShadowTreeWithNewPropsRecursive(
    const ShadowNode &shadowNode,
    const ChildrenMap &childrenMap,
    const PropsMap &propsMap) {
  const auto family = shadowNode.getFamilyShared();
  const auto affectedChildrenIt = childrenMap.find(family);
  auto children = shadowNode.getChildren();

  if (affectedChildrenIt != childrenMap.end()) {
    for (const auto index : affectedChildrenIt->second) {
      children[index] = cloneShadowTreeWithNewPropsRecursive(*children[index], childrenMap, propsMap);
    }
  }

  Props::Shared newProps = ShadowNodeFragment::propsPlaceholder();
  const auto propsIt = propsMap.find(family);
  if (propsIt != propsMap.end() && !propsIt->second.empty()) {
    newProps = mergeProps(shadowNode, propsIt->second, children);
  }

  return shadowNode.clone(
      {newProps,
       std::make_shared<std::vector<std::shared_ptr<const ShadowNode>>>(children),
       shadowNode.getState(),
       false});
}

RootShadowNode::Unshared cloneShadowTreeWithNewProps(const RootShadowNode &oldRootNode, const PropsMap &propsMap) {
  ReanimatedSystraceSection s("ShadowTreeCloner::cloneShadowTreeWithNewProps");

  ChildrenMap childrenMap;

  {
    ReanimatedSystraceSection s("ShadowTreeCloner::prepareChildrenMap");

    for (const auto &[family, _] : propsMap) {
      const auto ancestors = family->getAncestors(oldRootNode);

      for (const auto &[parentNode, index] : std::ranges::reverse_view(ancestors)) {
        const auto parentFamily = parentNode.get().getFamilyShared();
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
      cloneShadowTreeWithNewPropsRecursive(oldRootNode, childrenMap, propsMap));
}

} // namespace reanimated
