#pragma once

#include <reanimated/CSS/common/definitions.h>

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
  virtual ~TransformOperation() = default;

  virtual TransformOperationType getType() const = 0;
  virtual jsi::Value valueToJSIValue(jsi::Runtime &rt) const = 0;

  static std::string getOperationName(TransformOperationType type);
  static std::unique_ptr<TransformOperation> fromJSIValue(
      jsi::Runtime &rt,
      const jsi::Value &value);
  jsi::Value toJSIValue(jsi::Runtime &rt) const;
};

using TransformOperations = std::vector<std::unique_ptr<TransformOperation>>;

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
};

// Scale
struct ScaleOperation : public TransformOperation {
  const double value;

  ScaleOperation(double value);
  TransformOperationType getType() const override;
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
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
  const MatrixArray value;

  MatrixOperation(const MatrixArray &value);
  TransformOperationType getType() const override;
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
};

} // namespace reanimated
