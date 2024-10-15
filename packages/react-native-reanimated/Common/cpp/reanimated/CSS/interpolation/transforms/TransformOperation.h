#pragma once

#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/interpolation/transforms/TransformMatrix.h>

using namespace facebook;

namespace reanimated {

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
  Unknown,
};

// Base class for TransformOperation
struct TransformOperation {
  virtual TransformOperationType getType() const = 0;
  virtual jsi::Value valueToJSIValue(jsi::Runtime &rt) const = 0;

  void assertCanConvertTo(TransformOperationType type) const;
  virtual bool canConvertTo(TransformOperationType type) const;
  virtual std::vector<std::shared_ptr<TransformOperation>> convertTo(
      TransformOperationType type) const;

  static std::string getOperationName(TransformOperationType type);
  static std::shared_ptr<TransformOperation> fromJSIValue(
      jsi::Runtime &rt,
      const jsi::Value &value);
  jsi::Value toJSIValue(jsi::Runtime &rt) const;
};

using TransformOperations = std::vector<std::shared_ptr<TransformOperation>>;

/**
 * Concrete transform operations
 */
// Perspective
struct PerspectiveOperation : public TransformOperation {
  const double value;

  PerspectiveOperation(double value);
  TransformOperationType getType() const override;
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
};

// Rotate
struct RotateOperation : public TransformOperation {
  const AngleValue value;

  RotateOperation(const AngleValue &value);
  TransformOperationType getType() const override;
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
};

struct RotateXOperation : public RotateOperation {
  RotateXOperation(const AngleValue &value);
  TransformOperationType getType() const override;
};

struct RotateYOperation : public RotateOperation {
  RotateYOperation(const AngleValue &value);
  TransformOperationType getType() const override;
};

struct RotateZOperation : public RotateOperation {
  RotateZOperation(const AngleValue &value);
  TransformOperationType getType() const override;
  bool canConvertTo(TransformOperationType type) const override;
  TransformOperations convertTo(TransformOperationType type) const override;
};

// Scale
struct ScaleOperation : public TransformOperation {
  const double value;

  ScaleOperation(double value);
  TransformOperationType getType() const override;
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
  bool canConvertTo(TransformOperationType type) const final;
  TransformOperations convertTo(TransformOperationType type) const final;
};

struct ScaleXOperation : public ScaleOperation {
  ScaleXOperation(double value);
  TransformOperationType getType() const override;
};

struct ScaleYOperation : public ScaleOperation {
  ScaleYOperation(double value);
  TransformOperationType getType() const override;
};

// Translate
struct TranslateXOperation : public TransformOperation {
  const UnitValue value;

  TranslateXOperation(const UnitValue &value);
  TransformOperationType getType() const override;
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
};

struct TranslateYOperation : public TransformOperation {
  const UnitValue value;

  TranslateYOperation(const UnitValue &value);
  TransformOperationType getType() const override;
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
};

// Skew
struct SkewXOperation : public TransformOperation {
  const AngleValue value;

  SkewXOperation(const AngleValue &value);
  TransformOperationType getType() const override;
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
};

struct SkewYOperation : public TransformOperation {
  const AngleValue value;

  SkewYOperation(const AngleValue &value);
  TransformOperationType getType() const override;
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
};

// Matrix
struct MatrixOperation : public TransformOperation {
  const TransformMatrix value;
  // Operations to apply on the matrix before resolving the final value
  const TransformOperations operations;

  MatrixOperation(const TransformMatrix &value);
  MatrixOperation(const TransformOperations &operations);
  TransformOperationType getType() const override;
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
};

} // namespace reanimated
