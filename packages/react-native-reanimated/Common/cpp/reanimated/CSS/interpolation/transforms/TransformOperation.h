#pragma once

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

// Base struct for TransformOperation
struct TransformOperation {
  const TransformOp type;

  explicit TransformOperation(TransformOp value);

  virtual bool operator==(const TransformOperation &other) const = 0;

  std::string getOperationName() const;
  virtual bool isRelative() const;
  // Tells if the transform operations is 3D-only (cannot be represented in 2D)
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

  virtual TransformMatrix::Shared toMatrix(bool force3D) const = 0;
};

using TransformOperations = std::vector<std::shared_ptr<TransformOperation>>;

// Base implementation for transform operations (except MatrixOperation)
template <TransformOp TOperation, typename TValue>
struct TransformOperationBase : public TransformOperation {
  const TValue value;

  explicit TransformOperationBase(TValue value)
      : TransformOperation(TOperation), value(std::move(value)) {}

  bool operator==(const TransformOperation &other) const override {
    if (type != other.type) {
      return false;
    }
    const auto &otherOperation =
        static_cast<const TransformOperationBase<TOperation, TValue> &>(other);
    return value == otherOperation.value;
  }

  TransformMatrix::Shared toMatrix(bool force3D) const override {
    if constexpr (Resolvable<TValue>) {
      // Handle resolvable operations
      throw std::runtime_error(
          "[Reanimated] Cannot convert resolvable operation to matrix: " +
          getOperationName());
    } else {
      // Handle regular operations
      const auto shouldBe3D = this->is3D() || force3D;

      if (cachedMatrix_) {
        const auto resultDimension =
            shouldBe3D ? MATRIX_3D_DIMENSION : MATRIX_2D_DIMENSION;
        if (cachedMatrix_->getDimension() == resultDimension) {
          return cachedMatrix_;
        }
      }

      TransformMatrix::Shared result;
      if (shouldBe3D) {
        result = std::make_shared<const TransformMatrix3D>(
            TransformMatrix3D::create<TOperation>(this->value.value));
      } else {
        result = std::make_shared<const TransformMatrix2D>(
            TransformMatrix2D::create<TOperation>(this->value.value));
      }

      cachedMatrix_ = result;
      return result;
    }
  }

 protected:
  mutable TransformMatrix::Shared cachedMatrix_;
};

} // namespace reanimated::css
