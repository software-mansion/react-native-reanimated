#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/common/transforms/TransformMatrix2D.h>
#include <reanimated/CSS/common/transforms/TransformMatrix3D.h>
#include <reanimated/CSS/common/transforms/TransformOp.h>
#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/common/values/CSSLength.h>
#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>

#include <react/renderer/core/ShadowNode.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <variant>
#include <vector>

namespace reanimated::css {

using namespace facebook;
using namespace react;

struct TransformInterpolationContext {
  const std::shared_ptr<const ShadowNode> &node;
  const std::shared_ptr<ViewStylesRepository> &viewStylesRepository;
};

// Base struct for TransformOperation
struct TransformOperation {
  virtual bool operator==(const TransformOperation &other) const = 0;

  std::string getOperationName() const;
  virtual TransformOp type() const = 0;
  virtual bool isRelative() const;
  virtual bool is3D() const;

  static std::shared_ptr<TransformOperation> fromJSIValue(
      jsi::Runtime &rt,
      const jsi::Value &value);
  static std::shared_ptr<TransformOperation> fromDynamic(
      const folly::dynamic &value);
  folly::dynamic toDynamic() const;
  virtual folly::dynamic valueToDynamic() const = 0;

  virtual bool canConvertTo(TransformOp type) const;
  virtual std::vector<std::shared_ptr<TransformOperation>> convertTo(
      TransformOp type) const;
  void assertCanConvertTo(TransformOp type) const;

  virtual std::unique_ptr<TransformMatrix> toMatrix(bool force3D) const = 0;
  virtual std::unique_ptr<TransformMatrix> toMatrix(
      bool force3D,
      const ResolvableValueInterpolationContext &context) const = 0;
};

using TransformOperations = std::vector<std::shared_ptr<TransformOperation>>;

// Base class with common functionality
template <typename TValue>
struct TransformOperationBaseCommon : public TransformOperation {
  const TValue value;

  explicit TransformOperationBaseCommon(const TValue &value) : value(value) {}
  virtual ~TransformOperationBaseCommon() = default;

  bool operator==(const TransformOperation &other) const override {
    if (type() != other.type()) {
      return false;
    }
    const auto &otherOperation =
        static_cast<const TransformOperationBaseCommon<TValue> &>(other);
    return value == otherOperation.value;
  }
};

// Template overload to inherit from in final operation structs
template <TransformOp TOperation, typename TValue>
struct TransformOperationBase : public TransformOperationBaseCommon<TValue> {
  explicit TransformOperationBase(const TValue &value)
      : TransformOperationBaseCommon<TValue>(value) {}

  TransformOp type() const override {
    return TOperation;
  }

  std::unique_ptr<TransformMatrix> toMatrix(bool force3D) const override {
    if (force3D) {
      auto matrix = TransformMatrix3D::create<TOperation>(this->value.value);
      return std::unique_ptr<TransformMatrix>(
          new TransformMatrix3D(std::move(matrix)));
    }
    auto matrix = TransformMatrix2D::create<TOperation>(this->value.value);
    return std::unique_ptr<TransformMatrix>(
        new TransformMatrix2D(std::move(matrix)));
  }

  std::unique_ptr<TransformMatrix> toMatrix(
      bool force3D,
      const ResolvableValueInterpolationContext &context) const override {
    return toMatrix(force3D);
  }
};

// Specialization for MatrixOperation to avoid the template implementation
template <typename TValue>
struct TransformOperationBase<TransformOp::Matrix, TValue>
    : public TransformOperationBaseCommon<TValue> {
  using Base = TransformOperationBaseCommon<TValue>;

  explicit TransformOperationBase(const TValue &value) : Base(value) {}

  TransformOp type() const override {
    return TransformOp::Matrix;
  }

  std::unique_ptr<TransformMatrix> toMatrix(bool force3D) const override = 0;
  std::unique_ptr<TransformMatrix> toMatrix(
      bool force3D,
      const ResolvableValueInterpolationContext &context) const override = 0;
};

template <typename TOperation>
concept ResolvableOperation = requires(TOperation operation) {
  {
    operation.value
  } -> std::convertible_to<
      typename std::remove_reference_t<decltype(operation.value)>>;
  requires Resolvable<std::remove_reference_t<decltype(operation.value)>>;
}; // NOLINT(readability/braces)

} // namespace reanimated::css
