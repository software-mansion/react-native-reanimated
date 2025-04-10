#include <reanimated/apple/view/ReanimatedViewCustomShadowNode.h>

namespace facebook {
namespace react {

void ReanimatedViewCustomShadowNode::layout(LayoutContext layoutContext) {
  YogaLayoutableShadowNode::layout(layoutContext);
}

} // namespace react
} // namespace facebook
