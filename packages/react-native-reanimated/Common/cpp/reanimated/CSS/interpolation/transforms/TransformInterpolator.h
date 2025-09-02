#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

#include <memory>
#include <unordered_map>

namespace reanimated::css {

class TransformInterpolator {
 public:
  using Interpolators =
      std::unordered_map<TransformOp, std::shared_ptr<TransformInterpolator>>;

  virtual ~TransformInterpolator() = default;

  virtual std::shared_ptr<TransformOperation> getDefaultOperation() const = 0;
  virtual std::shared_ptr<TransformOperation> interpolate(
      double progress,
      const std::shared_ptr<TransformOperation> &from,
      const std::shared_ptr<TransformOperation> &to,
      const TransformInterpolationContext &context) const = 0;
  virtual std::shared_ptr<TransformOperation> resolveOperation(
      const std::shared_ptr<TransformOperation> &operation,
      const TransformInterpolationContext &context) const = 0;
};

template <typename TOperation>
class TransformInterpolatorBase : public TransformInterpolator {
 public:
  explicit TransformInterpolatorBase(
      std::shared_ptr<TransformOperation> defaultOperation)
      : defaultOperation_(defaultOperation) {}

  std::shared_ptr<TransformOperation> getDefaultOperation() const override {
    return defaultOperation_;
  }

  std::shared_ptr<TransformOperation> interpolate(
      double progress,
      const std::shared_ptr<TransformOperation> &from,
      const std::shared_ptr<TransformOperation> &to,
      const TransformInterpolationContext &context) const override {
    return std::make_shared<TOperation>(interpolate(
        progress,
        *std::static_pointer_cast<TOperation>(from),
        *std::static_pointer_cast<TOperation>(to),
        context));
  }

  std::shared_ptr<TransformOperation> resolveOperation(
      const std::shared_ptr<TransformOperation> &operation,
      const TransformInterpolationContext &context) const override {
    return std::make_shared<TOperation>(resolveOperation(
        *std::static_pointer_cast<TOperation>(operation), context));
  }

 protected:
  virtual TOperation interpolate(
      double progress,
      const TOperation &from,
      const TOperation &to,
      const TransformInterpolationContext &context) const = 0;

  virtual TOperation resolveOperation(
      const TOperation &operation,
      const TransformInterpolationContext &context) const {
    return operation;
  }

 private:
  std::shared_ptr<TransformOperation> defaultOperation_;
};

using TransformOperationInterpolators = TransformInterpolator::Interpolators;

} // namespace reanimated::css
