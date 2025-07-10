#pragma once

#include <reanimated/CSS/common/TransformMatrix.h>
#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/common/values/CSSDimension.h>
#include <reanimated/CSS/common/values/CSSNumber.h>

#include <react/renderer/core/ShadowNode.h>

#include <folly/dynamic.h>
#include <memory>
#include <string>
#include <unordered_map>
#include <variant>
#include <vector>

#ifndef NDEBUG
#include <iostream>
#endif // NDEBUG

namespace reanimated::css {

using namespace facebook;
using namespace react;

enum class TransformOperationType {
  Perspective,
  Rotate,
  RotateX,
  RotateY,
  RotateZ,
  Scale,
  ScaleX,
  ScaleY,
  TranslateX,
  TranslateY,
  SkewX,
  SkewY,
  Matrix,
};

TransformOperationType getTransformOperationType(const std::string &property);
std::string getOperationNameFromType(TransformOperationType type);

// Base struct for TransformOperation
struct TransformOperation {
  virtual bool operator==(const TransformOperation &other) const = 0;

#ifndef NDEBUG
  friend std::ostream &operator<<(
      std::ostream &os,
      const TransformOperation &operation);
  virtual std::string getOperationValue() const = 0;
#endif // NDEBUG

  std::string getOperationName() const;
  virtual TransformOperationType type() const = 0;
  virtual bool isRelative() const;

  static std::shared_ptr<TransformOperation> fromDynamic(
      const folly::dynamic &value);
  folly::dynamic toDynamic() const;
  virtual folly::dynamic valueToDynamic() const = 0;

  virtual bool canConvertTo(TransformOperationType type) const;
  virtual std::vector<std::shared_ptr<TransformOperation>> convertTo(
      TransformOperationType type) const;

  virtual TransformMatrix toMatrix() const = 0;
  void assertCanConvertTo(TransformOperationType type) const;
};

using TransformOperations = std::vector<std::shared_ptr<TransformOperation>>;

template <typename TValue>
struct TransformOperationBase : public TransformOperation {
  const TValue value;

  explicit TransformOperationBase(const TValue &value);
  virtual ~TransformOperationBase() = default;

  bool operator==(const TransformOperation &other) const override;

#ifndef NDEBUG
  std::string getOperationValue() const override;
#endif // NDEBUG
};

/**
 * Concrete transform operations
 */
// Perspective
struct PerspectiveOperation final : public TransformOperationBase<CSSDouble> {
  using TransformOperationBase<CSSDouble>::TransformOperationBase;
  explicit PerspectiveOperation(double value);
  TransformOperationType type() const override;
  folly::dynamic valueToDynamic() const override;
  TransformMatrix toMatrix() const override;
};

// Rotate
struct RotateOperation : public TransformOperationBase<CSSAngle> {
  using TransformOperationBase<CSSAngle>::TransformOperationBase;
  explicit RotateOperation(const std::string &value);
  TransformOperationType type() const override;
  folly::dynamic valueToDynamic() const override;
  TransformMatrix toMatrix() const override;
};

struct RotateXOperation final : public RotateOperation {
  using RotateOperation::RotateOperation;
  TransformOperationType type() const override;
  TransformMatrix toMatrix() const override;
};

struct RotateYOperation final : public RotateOperation {
  using RotateOperation::RotateOperation;
  TransformOperationType type() const override;
  TransformMatrix toMatrix() const override;
};

struct RotateZOperation final : public RotateOperation {
  using RotateOperation::RotateOperation;
  TransformOperationType type() const override;
  TransformMatrix toMatrix() const override;
  bool canConvertTo(TransformOperationType type) const override;
  TransformOperations convertTo(TransformOperationType type) const override;
};

// Scale
struct ScaleOperation : public TransformOperationBase<CSSDouble> {
  using TransformOperationBase<CSSDouble>::TransformOperationBase;
  explicit ScaleOperation(double value);
  TransformOperationType type() const override;
  folly::dynamic valueToDynamic() const override;
  bool canConvertTo(TransformOperationType type) const override;
  TransformOperations convertTo(TransformOperationType type) const override;
  TransformMatrix toMatrix() const override;
};

struct ScaleXOperation final : public ScaleOperation {
  using ScaleOperation::ScaleOperation;
  TransformOperationType type() const override;
  TransformMatrix toMatrix() const override;
};

struct ScaleYOperation final : public ScaleOperation {
  using ScaleOperation::ScaleOperation;
  TransformOperationType type() const override;
  TransformMatrix toMatrix() const override;
};

// Translate
struct TranslateOperation : public TransformOperationBase<CSSDimension> {
  using TransformOperationBase<CSSDimension>::TransformOperationBase;
  explicit TranslateOperation(double value);
  explicit TranslateOperation(const std::string &value);
  bool isRelative() const override;
  folly::dynamic valueToDynamic() const override;
  virtual TransformMatrix toMatrix(double resolvedValue) const = 0;
  TransformMatrix toMatrix() const override;
};

struct TranslateXOperation final : public TranslateOperation {
  using TranslateOperation::TranslateOperation;
  TransformOperationType type() const override;
  TransformMatrix toMatrix(double resolvedValue) const override;
};

struct TranslateYOperation final : public TranslateOperation {
  using TranslateOperation::TranslateOperation;
  TransformOperationType type() const override;
  TransformMatrix toMatrix(double resolvedValue) const override;
};

// Skew
struct SkewOperation : public TransformOperationBase<CSSAngle> {
  using TransformOperationBase<CSSAngle>::TransformOperationBase;
  explicit SkewOperation(const std::string &value);
  folly::dynamic valueToDynamic() const override;
};

struct SkewXOperation final : public SkewOperation {
  using SkewOperation::SkewOperation;
  TransformOperationType type() const override;
  TransformMatrix toMatrix() const override;
};

struct SkewYOperation final : public SkewOperation {
  using SkewOperation::SkewOperation;
  TransformOperationType type() const override;
  TransformMatrix toMatrix() const override;
};

// Matrix
struct MatrixOperation final
    : public TransformOperationBase<
          std::variant<TransformMatrix, TransformOperations>> {
  using TransformOperationBase<
      std::variant<TransformMatrix, TransformOperations>>::
      TransformOperationBase;
  explicit MatrixOperation(const TransformMatrix &value);
  explicit MatrixOperation(const TransformOperations &operations);

  bool operator==(const TransformOperation &other) const override;

  TransformOperationType type() const override;
  folly::dynamic valueToDynamic() const override;
  TransformMatrix toMatrix() const override;
};

} // namespace reanimated::css
