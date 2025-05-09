#pragma once

#include <react/renderer/components/rnreanimated/EventEmitters.h>
#include <react/renderer/components/rnreanimated/Props.h>
#include <react/renderer/components/rnreanimated/ReanimatedViewStateData.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/core/LayoutContext.h>
#include <reanimated/NativeModules/ReanimatedModuleProxy.h>

#include <jsi/jsi.h>

namespace facebook::react {

JSI_EXPORT extern const char ReanimatedViewComponentName[];

using ReanimatedViewShadowNodeBase = ConcreteViewShadowNode<
    ReanimatedViewComponentName,
    ReanimatedViewProps,
    ReanimatedViewEventEmitter,
    ReanimatedViewStateData>;

struct BBShadowNode : public ShadowNode {
  void updateProps(Props::Shared props) {
    LOG(INFO) << "update props: " << props->getDebugPropsDescription();
    LOG(INFO) << "current props: " << props_->getDebugPropsDescription();
    props_ = props;
  }
};

class ReanimatedShadowNode final : public ReanimatedViewShadowNodeBase {
 public:
  std::shared_ptr<AnimatedPropsRegistry> animatedPropsRegistry_;

  ReanimatedShadowNode(
      const ShadowNodeFragment &fragment,
      const ShadowNodeFamily::Shared &family,
      ShadowNodeTraits traits);

  ReanimatedShadowNode(
      const ShadowNode &sourceShadowNode,
      const ShadowNodeFragment &fragment);

  void layout(LayoutContext layoutContext) override;
  void updateChildProps(const ShadowNode::Shared &child) const;
  void appendChild(const ShadowNode::Shared &child) override;

  void replaceChild(
      const ShadowNode &oldChild,
      const ShadowNode::Shared &newChild,
      size_t suggestedIndex = SIZE_MAX) override;
};
} // namespace facebook::react
