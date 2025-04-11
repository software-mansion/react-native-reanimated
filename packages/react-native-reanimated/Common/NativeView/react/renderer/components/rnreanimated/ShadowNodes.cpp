#include "ShadowNodes.h"
#include <react/renderer/core/LayoutContext.h>

namespace facebook::react {

extern const char ReanimatedViewComponentName[] = "ReanimatedView";

void ReanimatedViewCustomShadowNode::layout(LayoutContext layoutContext) {
  YogaLayoutableShadowNode::layout(layoutContext);
}

} // namespace facebook::react
