#pragma once

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

namespace reanimated {

class TransformInterpolator {
 public:
  using TransformInterpolators = std::unordered_map<
      TransformOperationType,
      std::shared_ptr<TransformInterpolator>>;

  struct UpdateContext {
    const ShadowNode::Shared &node;
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository;
    const std::shared_ptr<TransformInterpolators> &interpolators;
  };

  TransformInterpolator(
      const std::shared_ptr<TransformOperation> &defaultOperation)
      : defaultOperation_(defaultOperation) {}

  std::shared_ptr<TransformOperation> getDefaultOperation() const {
    return defaultOperation_;
  }

  virtual std::shared_ptr<TransformOperation> resolveOperation(
      const TransformOperation &operation,
      const ShadowNode::Shared &shadowNode,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      const = 0;
  virtual std::shared_ptr<TransformOperation> interpolate(
      const double progress,
      const TransformOperation &fromOperation,
      const TransformOperation &toOperation,
      const UpdateContext &context) const = 0;

 protected:
  const std::shared_ptr<TransformOperation> defaultOperation_;
};

template <typename OperationType>
class TransformInterpolatorBase : public TransformInterpolator {
 public:
  TransformInterpolatorBase(
      const std::shared_ptr<OperationType> &defaultOperation)
      : TransformInterpolator(defaultOperation) {}

  std::shared_ptr<TransformOperation> resolveOperation(
      const TransformOperation &operation,
      const ShadowNode::Shared &shadowNode,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      const override {
    const auto &op = static_cast<const OperationType &>(operation);
    return std::make_shared<OperationType>(
        resolveOperation(op, shadowNode, viewStylesRepository));
  }

  std::shared_ptr<TransformOperation> interpolate(
      const double progress,
      const TransformOperation &fromOperation,
      const TransformOperation &toOperation,
      const UpdateContext &context) const override {
    const auto &from = static_cast<const OperationType &>(fromOperation);
    const auto &to = static_cast<const OperationType &>(toOperation);

    return std::make_shared<OperationType>(
        interpolate(progress, from, to, context));
  }

 protected:
  virtual OperationType resolveOperation(
      const OperationType &operation,
      const ShadowNode::Shared &shadowNode,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const {
    return operation;
  }

  virtual OperationType interpolate(
      const double progress,
      const OperationType &fromOperation,
      const OperationType &toOperation,
      const UpdateContext &context) const = 0;
};

using TransformInterpolatorUpdateContext = TransformInterpolator::UpdateContext;
using TransformInterpolators = TransformInterpolator::TransformInterpolators;
using TransformInterpolatorsMap =
    std::unordered_map<std::string, std::shared_ptr<TransformInterpolator>>;

} // namespace reanimated
