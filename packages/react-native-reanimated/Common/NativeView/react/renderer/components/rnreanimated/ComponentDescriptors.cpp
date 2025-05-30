#include <react/renderer/components/rnreanimated/ComponentDescriptors.h>

namespace facebook::react {

ReanimatedViewComponentDescriptor::ReanimatedViewComponentDescriptor(
    const ComponentDescriptorParameters &parameters)
    : ConcreteComponentDescriptor<ReanimatedShadowNode>(
          parameters,
          {true /* useRawPropsJsiValue */}) {}

std::shared_ptr<ShadowNode> ReanimatedViewComponentDescriptor::createShadowNode(
    const ShadowNodeFragment &fragment,
    const ShadowNodeFamily::Shared &family) const {
  const auto timestamp = 0; // TODO - get correct timestamp

  auto shadowNode =
      std::make_shared<ReanimatedShadowNode>(fragment, family, getTraits());

  const auto &props = static_cast<const ReanimatedNodeProps &>(*fragment.props);
  shadowNode->onCreate(timestamp, props);

  applyFrame(timestamp, shadowNode);

  return shadowNode;
}

ShadowNode::Unshared ReanimatedViewComponentDescriptor::cloneShadowNode(
    const ShadowNode &sourceShadowNode,
    const ShadowNodeFragment &fragment) const {
  const auto timestamp = 0; // TODO - get correct timestamp

  auto shadowNode =
      std::make_shared<ReanimatedShadowNode>(sourceShadowNode, fragment);

  if (fragment.props != ShadowNodeFragment::propsPlaceholder() &&
      &fragment.props != &sourceShadowNode.getProps()) {
    const auto &oldProps =
        static_cast<const ReanimatedNodeProps &>(*sourceShadowNode.getProps());
    const auto &newProps =
        static_cast<const ReanimatedNodeProps &>(*fragment.props);
    shadowNode->onPropsChange(timestamp, oldProps, newProps);
  }

  applyFrame(timestamp, shadowNode);

  return shadowNode;
}

State::Shared ReanimatedViewComponentDescriptor::createInitialState(
    const Props::Shared & /*props*/,
    const ShadowNodeFamily::Shared &family) const {
  return std::make_shared<const ConcreteState>(
      std::make_shared<ReanimatedViewStateData>(getProxy()), family);
}

void ReanimatedViewComponentDescriptor::applyFrame(
    const double timestamp,
    const ReanimatedShadowNode::Shared &shadowNode) const {
  const auto &children = shadowNode->getChildren();

  if (children.empty()) {
    return;
  }

  if (children.size() > 1) {
    throw std::runtime_error(
        "ReanimatedViewComponentDescriptor: ReanimatedView can only have one "
        "child");
  }
}

std::shared_ptr<ReanimatedModuleProxy>
ReanimatedViewComponentDescriptor::getProxy() const {
  // Sometimes ReanimatedModuleProxy is initialized before
  // ReanimatedViewComponentDescriptor and sometimes after it. Because of that,
  // we cannot get the proxy instance in the constructor and need to use this
  // getter function. Each of ReanimatedViewComponentDescriptor methods is
  // called after ReanimatedModuleProxy is already added to the context
  // container, so we can safely call this getter function anywhere in the
  // component descriptor except for the constructor.
  return contextContainer_
      ->at<std::weak_ptr<ReanimatedModuleProxy>>("ReanimatedModuleProxy")
      .lock();
}

} // namespace facebook::react
