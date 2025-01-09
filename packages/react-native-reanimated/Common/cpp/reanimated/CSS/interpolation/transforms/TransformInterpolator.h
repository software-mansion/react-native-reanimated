#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>

#include <memory>
#include <unordered_map>

namespace reanimated {

class TransformInterpolator {
 public:
  using Interpolators = std::unordered_map<
      TransformOperationType,
      std::shared_ptr<TransformInterpolator>>;

  struct UpdateContext {
    const ShadowNode::Shared &node;
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

template <typename T>
class TransformInterpolatorBase : public TransformInterpolator {
 public:
  explicit TransformInterpolatorBase(std::shared_ptr<T> defaultOperation)
      : defaultOperation_(defaultOperation) {}

  std::shared_ptr<TransformOperation> getDefaultOperation() const override {
    return defaultOperation_;
  }

  std::shared_ptr<TransformOperation> interpolate(
      double progress,
      const std::shared_ptr<TransformOperation> &from,
      const std::shared_ptr<TransformOperation> &to,
      const UpdateContext &context) const override {
    return std::make_shared<T>(interpolate(
        progress,
        *std::static_pointer_cast<T>(from),
        *std::static_pointer_cast<T>(to),
        context));
  }

  std::shared_ptr<TransformOperation> resolveOperation(
      const std::shared_ptr<TransformOperation> &operation,
      const UpdateContext &context) const override {
    return std::make_shared<T>(
        resolveOperation(*std::static_pointer_cast<T>(operation), context));
  }

 protected:
  virtual T interpolate(
      double progress,
      const T &from,
      const T &to,
      const UpdateContext &context) const = 0;

  virtual T resolveOperation(const T &operation, const UpdateContext &context)
      const {
    return operation;
  }

 private:
  std::shared_ptr<T> defaultOperation_;
};

using TransformInterpolators = TransformInterpolator::Interpolators;
using TransformInterpolatorUpdateContext = TransformInterpolator::UpdateContext;

} // namespace reanimated

#endif
