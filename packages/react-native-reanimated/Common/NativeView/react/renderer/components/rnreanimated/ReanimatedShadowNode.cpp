#include <react/renderer/components/rnreanimated/ReanimatedShadowNode.h>

namespace facebook::react {

extern const char ReanimatedViewComponentName[] = "ReanimatedView";

void ReanimatedShadowNode::initialize(
    const std::shared_ptr<CSSAnimationsRegistry> &reanimatedModuleProxy) const {
  LOG(INFO) << "We can access the reanimatedModuleProxy here";
}

void ReanimatedShadowNode::layout(LayoutContext layoutContext) {
  YogaLayoutableShadowNode::layout(layoutContext);
}

} // namespace facebook::react
