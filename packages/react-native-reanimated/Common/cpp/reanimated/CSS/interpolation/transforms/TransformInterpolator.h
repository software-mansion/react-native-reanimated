#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/interpolation/PropertyInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>

namespace reanimated {

class TransformInterpolator {
 public:
  TransformInterpolator(
      const std::shared_ptr<TransformOperation> &defaultOperation)
      : defaultOperation_(defaultOperation) {}

  std::shared_ptr<TransformOperation> getDefaultOperation() const {
    return defaultOperation_;
  }
  virtual std::shared_ptr<TransformOperation> interpolate(
      const double progress,
      const TransformOperation &fromOperation,
      const TransformOperation &toOperation,
      const InterpolationUpdateContext &context) const = 0;

 protected:
  const std::shared_ptr<TransformOperation> defaultOperation_;
};

template <typename OperationType>
class TransformInterpolatorBase : public TransformInterpolator {
 public:
  TransformInterpolatorBase(
      const std::shared_ptr<OperationType> &defaultOperation)
      : TransformInterpolator(defaultOperation) {}

  std::shared_ptr<TransformOperation> interpolate(
      const double progress,
      const TransformOperation &fromOperation,
      const TransformOperation &toOperation,
      const InterpolationUpdateContext &context) const override {
    const auto &from = static_cast<const OperationType &>(fromOperation);
    const auto &to = static_cast<const OperationType &>(toOperation);

    return std::make_shared<OperationType>(
        interpolate(progress, from, to, context));
  }

 protected:
  virtual OperationType interpolate(
      const double progress,
      const OperationType &fromOperation,
      const OperationType &toOperation,
      const InterpolationUpdateContext &context) const = 0;
};

using TransformInterpolators = std::unordered_map<
    TransformOperationType,
    std::shared_ptr<TransformInterpolator>>;
using TransformInterpolatorsMap =
    std::unordered_map<std::string, std::shared_ptr<TransformInterpolator>>;

} // namespace reanimated
