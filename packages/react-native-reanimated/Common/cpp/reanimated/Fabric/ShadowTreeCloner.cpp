#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>

#include <cstring>
#include <memory>
#include <optional>
#include <ranges>
#include <string>
#include <utility>

namespace reanimated {

namespace {

bool isTextComponent(const ShadowNode &shadowNode) {
  return !strcmp(shadowNode.getComponentName(), "Paragraph") || !strcmp(shadowNode.getComponentName(), "Text");
}

std::optional<std::string> extractChildrenProp(
    const std::vector<RawProps> &propsVector,
    std::vector<RawProps> &strippedProps) {
  std::optional<std::string> text;
  for (const auto &props : propsVector) {
    auto propsDynamic = props.toDynamic();
    if (const auto *childrenProp = propsDynamic.get_ptr("children")) {
      text = childrenProp->asString();
      propsDynamic.erase("children");
    }
    if (!propsDynamic.empty()) {
      strippedProps.emplace_back(std::move(propsDynamic));
    }
  }
  return text;
}

std::shared_ptr<const ShadowNode> cloneRawTextWithNewText(const ShadowNode &rawTextNode, const std::string &text) {
  PropsParserContext propsParserContext{rawTextNode.getSurfaceId(), *rawTextNode.getContextContainer()};
  auto newProps = rawTextNode.getComponentDescriptor().cloneProps(
      propsParserContext, rawTextNode.getProps(), RawProps(folly::dynamic::object("text", text)));
  return rawTextNode.clone({newProps, ShadowNodeFragment::childrenPlaceholder(), rawTextNode.getState()});
}

} // namespace

Props::Shared mergeProps(const ShadowNode &shadowNode, const std::vector<RawProps> &propsVector) {
  ReanimatedSystraceSection s("ShadowTreeCloner::mergeProps");

  if (propsVector.empty()) {
    return ShadowNodeFragment::propsPlaceholder();
  }

  PropsParserContext propsParserContext{shadowNode.getSurfaceId(), *shadowNode.getContextContainer()};
  auto newProps = shadowNode.getProps();

#ifdef ANDROID
  if (propsVector.size() > 1) {
    folly::dynamic newPropsDynamic = folly::dynamic::object;
    for (const auto &props : propsVector) {
      newPropsDynamic = folly::dynamic::merge(newPropsDynamic, props.operator folly::dynamic());
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
  if (propsIt != propsMap.end()) {
    if (isTextComponent(shadowNode)) {
      std::vector<RawProps> strippedProps;
      const auto text = extractChildrenProp(propsIt->second, strippedProps);
      if (text && !children.empty()) {
        children[0] = cloneRawTextWithNewText(*children[0], *text);
      }
      newProps = mergeProps(shadowNode, strippedProps);
    } else {
      newProps = mergeProps(shadowNode, propsIt->second);
    }
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
