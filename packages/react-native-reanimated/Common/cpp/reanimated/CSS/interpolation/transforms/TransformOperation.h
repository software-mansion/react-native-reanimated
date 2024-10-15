#pragma once

#include <reanimated/CSS/common/AngleValue.h>
#include <reanimated/CSS/common/TransformMatrix.h>
#include <reanimated/CSS/common/UnitValue.h>
#include <reanimated/CSS/common/definitions.h>
#include <reanimated/CSS/misc/ViewStylesRepository.h>

#include <variant>

using namespace facebook;
using namespace react;

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

TransformOperationType getTransformOperationType(const std::string &property);

// Base class for TransformOperation
struct TransformOperation {
  const TransformOperationType type;

  TransformOperation(const TransformOperationType type);

  std::string getOperationName() const;
  virtual bool isRelative() const {
    return false;
  }

  static std::shared_ptr<TransformOperation> fromJSIValue(
      jsi::Runtime &rt,
      const jsi::Value &value);
  jsi::Value toJSIValue(jsi::Runtime &rt) const;
  virtual jsi::Value valueToJSIValue(jsi::Runtime &rt) const = 0;

  void assertCanConvertTo(const TransformOperationType type) const;
  virtual bool canConvertTo(const TransformOperationType type) const;
  virtual std::vector<std::shared_ptr<TransformOperation>> convertTo(
      TransformOperationType type) const;

  virtual TransformMatrix toMatrix() const = 0;
  virtual TransformMatrix toMatrix(
      const RelativeTo relativeTo,
      const std::string &relativeProperty,
      const ShadowNode::Shared &shadowNode,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) {
    return toMatrix(); // Default for non-relative operations
  }
};

using TransformOperations = std::vector<std::shared_ptr<TransformOperation>>;

/**
 * Concrete transform operations
 */
// Perspective
struct PerspectiveOperation : public TransformOperation {
  const double value;

  PerspectiveOperation(const double value);
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
  TransformMatrix toMatrix() const override;
};

// Rotate
struct RotateOperation : public TransformOperation {
  const AngleValue value;

  RotateOperation(const AngleValue &value);
  RotateOperation(const TransformOperationType type, const AngleValue &value);
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
  TransformMatrix toMatrix() const override;
};

struct RotateXOperation : public RotateOperation {
  RotateXOperation(const AngleValue &value);
  TransformMatrix toMatrix() const override;
};

struct RotateYOperation : public RotateOperation {
  RotateYOperation(const AngleValue &value);
  TransformMatrix toMatrix() const override;
};

struct RotateZOperation : public RotateOperation {
  RotateZOperation(const AngleValue &value);
  bool canConvertTo(const TransformOperationType type) const override;
  TransformOperations convertTo(
      const TransformOperationType type) const override;
  TransformMatrix toMatrix() const override;
};

// Scale
struct ScaleOperation : public TransformOperation {
  const double value;

  ScaleOperation(const double value);
  ScaleOperation(const TransformOperationType type, const double value);
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
  bool canConvertTo(const TransformOperationType type) const final;
  TransformOperations convertTo(const TransformOperationType type) const final;
  TransformMatrix toMatrix() const override;
};

struct ScaleXOperation : public ScaleOperation {
  ScaleXOperation(const double value);
  TransformMatrix toMatrix() const override;
};

struct ScaleYOperation : public ScaleOperation {
  ScaleYOperation(const double value);
  TransformMatrix toMatrix() const override;
};

// Translate
struct TranslateOperation : public TransformOperation {
  const UnitValue value;

  TranslateOperation(const TransformOperationType type, const UnitValue &value);
  bool isRelative() const override;
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
  virtual TransformMatrix toMatrix(const double resolvedValue) const = 0;
  TransformMatrix toMatrix() const override;
  TransformMatrix toMatrix(
      const RelativeTo relativeTo,
      const std::string &relativeProperty,
      const ShadowNode::Shared &shadowNode,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      override;
};

struct TranslateXOperation : public TranslateOperation {
  TranslateXOperation(const UnitValue &value);
  TransformMatrix toMatrix(const double resolvedValue) const override;
};

struct TranslateYOperation : public TranslateOperation {
  TranslateYOperation(const UnitValue &value);
  TransformMatrix toMatrix(const double resolvedValue) const override;
};

// Skew
struct SkewOperation : public TransformOperation {
  const AngleValue value;

  SkewOperation(const TransformOperationType type, const AngleValue &value);
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
};

struct SkewXOperation : public SkewOperation {
  SkewXOperation(const AngleValue &value);
  TransformMatrix toMatrix() const override;
};

struct SkewYOperation : public SkewOperation {
  SkewYOperation(const AngleValue &value);
  TransformMatrix toMatrix() const override;
};

// Matrix
struct MatrixOperation : public TransformOperation {
  const std::variant<TransformMatrix, TransformOperations> valueOrOperations;

  MatrixOperation(const TransformMatrix &value);
  MatrixOperation(const TransformOperations &operations);

  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
  TransformMatrix toMatrix() const override;
};

} // namespace reanimated
