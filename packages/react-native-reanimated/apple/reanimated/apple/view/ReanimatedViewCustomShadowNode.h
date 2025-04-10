#include <react/renderer/components/rnreanimated/ShadowNodes.h>

#include <react/debug/react_native_assert.h>
#include <react/renderer/components/view/ConcreteViewShadowNode.h>
#include <react/renderer/core/ConcreteComponentDescriptor.h>
#include <react/renderer/core/LayoutContext.h>

namespace facebook {
namespace react {

class ReanimatedViewCustomShadowNode final : public ReanimatedViewShadowNode {
 public:
  using ConcreteViewShadowNode::ConcreteViewShadowNode;

  void layout(LayoutContext layoutContext) override;
};

} // namespace react
} // namespace facebook
