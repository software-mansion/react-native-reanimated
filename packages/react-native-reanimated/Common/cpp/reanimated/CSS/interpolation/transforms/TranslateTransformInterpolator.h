#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/interpolation/transforms/TransformInterpolator.h>

#include <memory>
#include <string>

namespace reanimated {

template <typename OperationType>
class TranslateTransformInterpolator final
    : public TransformInterpolatorBase<OperationType> {
 public:
  TranslateTransformInterpolator(
      RelativeTo relativeTo,
      const std::string &relativeProperty,
      const UnitValue &defaultValue);

 protected:
  OperationType interpolate(
      double progress,
      const OperationType &fromOperation,
      const OperationType &toOperation,
      const TransformInterpolatorUpdateContext &context) const override;
  OperationType resolveOperation(
      const OperationType &operation,
      const ShadowNode::Shared &shadowNode,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      const override;

 private:
  const RelativeTo relativeTo_;
  const std::string relativeProperty_;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
