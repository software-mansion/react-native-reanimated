#pragma once

#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>

#include <memory>
#include <unordered_map>

namespace reanimated::css {

class TransformInterpolator {
 public:
  using Interpolators = std::unordered_map<
      TransformOperationType,
      std::shared_ptr<TransformInterpolator>>;

  struct UpdateContext {
    const std::shared_ptr<const ShadowNode> &node;
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository;
    const std::shared_ptr<Interpolators> &interpolators;
  };

  virtual ~TransformInterpolator() = default;

  virtual std::shared_ptr<TransformOperation> getDefaultOperation() const = 0;
  virtual std::shared_ptr<TransformOperation> interpolate(
      double progress,
      const std::shared_ptr<TransformOperation> &from,
      const std::shared_ptr<TransformOperation> &to,
      const UpdateContext &context) const = 0;
  virtual std::shared_ptr<TransformOperation> resolveOperation(
      const std::shared_ptr<TransformOperation> &operation,
      const UpdateContext &context) const = 0;
};

template <typename TOperation>
class TransformInterpolatorBase : public TransformInterpolator {
 public:
  explicit TransformInterpolatorBase(
      std::shared_ptr<TOperation> defaultOperation)
      : defaultOperation_(defaultOperation) {}

  std::shared_ptr<TransformOperation> getDefaultOperation() const override {
    return defaultOperation_;
  }

  std::shared_ptr<TransformOperation> interpolate(
      double progress,
      const std::shared_ptr<TransformOperation> &from,
      const std::shared_ptr<TransformOperation> &to,
      const UpdateContext &context) const override {
    return std::make_shared<TOperation>(interpolate(
        progress,
        *std::static_pointer_cast<TOperation>(from),
        *std::static_pointer_cast<TOperation>(to),
        context));
  }

  std::shared_ptr<TransformOperation> resolveOperation(
      const std::shared_ptr<TransformOperation> &operation,
      const UpdateContext &context) const override {
    return std::make_shared<TOperation>(resolveOperation(
        *std::static_pointer_cast<TOperation>(operation), context));
  }

 protected:
  virtual TOperation interpolate(
      double progress,
      const TOperation &from,
      const TOperation &to,
      const UpdateContext &context) const = 0;

  virtual TOperation resolveOperation(
      const TOperation &operation,
      const UpdateContext &context) const {
    return operation;
  }

 private:
  std::shared_ptr<TOperation> defaultOperation_;
};

using TransformInterpolators = TransformInterpolator::Interpolators;
using TransformInterpolatorUpdateContext = TransformInterpolator::UpdateContext;

} // namespace reanimated::css
