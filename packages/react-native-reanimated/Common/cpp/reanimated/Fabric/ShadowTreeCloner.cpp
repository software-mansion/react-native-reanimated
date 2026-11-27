#include <reanimated/Fabric/ShadowTreeCloner.h>
#include <reanimated/Tools/ReanimatedSystraceSection.h>

#include <cstring>
#include <memory>
#include <ranges>
#include <string>
#include <unordered_set>
#include <utility>

namespace reanimated {

namespace {

using ChildrenList = std::vector<std::shared_ptr<const ShadowNode>>;

bool isTextComponent(const ShadowNode &shadowNode) {
  return !strcmp(shadowNode.getComponentName(), "Paragraph") || !strcmp(shadowNode.getComponentName(), "Text");
}

std::shared_ptr<const ShadowNode> cloneRawTextWithNewText(const ShadowNode &rawTextNode, const std::string &text) {
  PropsParserContext propsParserContext{rawTextNode.getSurfaceId(), *rawTextNode.getContextContainer()};
  auto newProps = rawTextNode.getComponentDescriptor().cloneProps(
      propsParserContext, rawTextNode.getProps(), RawProps(folly::dynamic::object("text", text)));
  return rawTextNode.clone({newProps, ShadowNodeFragment::childrenPlaceholder(), rawTextNode.getState()});
}

// `children` is null when no child of `shadowNode` changes. It is replaced when a Text node gets a new
// `children` prop, which updates the text of its first child.
Props::Shared mergeProps(
    const ShadowNode &shadowNode,
    const std::vector<folly::dynamic> &propsVector,
    std::shared_ptr<const ChildrenList> &children) {
  ReanimatedSystraceSection s("ShadowTreeCloner::mergeProps");

  auto newPropsDynamic = propsVector.front();
  for (const auto &props : propsVector | std::views::drop(1)) {
    newPropsDynamic.update(props);
  }

  if (isTextComponent(shadowNode)) {
    if (const auto *childrenProp = newPropsDynamic.get_ptr("children")) {
      const auto &currentChildren = children ? *children : shadowNode.getChildren();
      if ((childrenProp->isString() || childrenProp->isNumber()) && !currentChildren.empty()) {
        auto newChildren = std::make_shared<ChildrenList>(currentChildren);
        (*newChildren)[0] = cloneRawTextWithNewText(*(*newChildren)[0], childrenProp->asString());
        children = std::move(newChildren);
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

} // namespace

RootShadowNode::Unshared cloneShadowTreeWithNewProps(const RootShadowNode &oldRootNode, const PropsMap &propsMap) {
  ReanimatedSystraceSection s("ShadowTreeCloner::cloneShadowTreeWithNewProps");

  std::unordered_set<std::shared_ptr<const ShadowNodeFamily>> families;
  families.reserve(propsMap.size());
  for (const auto &[family, _] : propsMap) {
    families.insert(family);
  }

  // `cloneMultiple` finds the affected children through the families' parent links, so it stays linear
  // in the number of animated nodes, also when many of them share a parent.
  auto newRootNode = oldRootNode.cloneMultiple(
      families, [&propsMap](const ShadowNode &shadowNode, const ShadowNodeFragment &fragment) {
        auto children = fragment.children;
        Props::Shared newProps = ShadowNodeFragment::propsPlaceholder();
        const auto propsIt = propsMap.find(shadowNode.getFamilyShared());
        if (propsIt != propsMap.end() && !propsIt->second.empty()) {
          newProps = mergeProps(shadowNode, propsIt->second, children);
        }
        return shadowNode.clone(
            {newProps, children ? children : ShadowNodeFragment::childrenPlaceholder(), shadowNode.getState(), false});
      });

  if (!newRootNode) {
    // None of the families is mounted under this root.
    newRootNode = oldRootNode.ShadowNode::clone(
        {ShadowNodeFragment::propsPlaceholder(),
         ShadowNodeFragment::childrenPlaceholder(),
         oldRootNode.getState(),
         false});
  }

  // This cast is safe, because this function returns a clone
  // of the oldRootNode, which is an instance of RootShadowNode
  return std::static_pointer_cast<RootShadowNode>(newRootNode);
}

} // namespace reanimated
