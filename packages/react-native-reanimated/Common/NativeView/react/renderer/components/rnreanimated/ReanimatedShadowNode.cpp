#include <react/renderer/components/rnreanimated/ReanimatedShadowNode.h>
#include <react/renderer/dom/DOM.h>

namespace facebook::react {

extern const char ReanimatedViewComponentName[] = "ReanimatedView";

void ReanimatedShadowNode::layout(LayoutContext layoutContext) {
  YogaLayoutableShadowNode::layout(layoutContext);
}

} // namespace facebook::react
