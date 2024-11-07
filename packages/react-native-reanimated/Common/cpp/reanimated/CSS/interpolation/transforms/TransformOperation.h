#pragma once

#include <reanimated/CSS/common/AngleValue.h>
#include <reanimated/CSS/common/TransformMatrix.h>
#include <reanimated/CSS/common/UnitValue.h>
#include <reanimated/CSS/common/definitions.h>

#include <react/renderer/core/ShadowNode.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <variant>
#include <vector>

namespace reanimated {

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
  Unknown,
};

TransformOperationType getTransformOperationType(const std::string &property);
std::string getOperationNameFromType(TransformOperationType type);

// Base class for TransformOperation
struct TransformOperation {
  const TransformOperationType type;

  explicit TransformOperation(TransformOperationType type);

  friend std::ostream &operator<<(
      std::ostream &os,
      const TransformOperation &operation);

  std::string getOperationName() const;
  virtual bool isRelative() const {
    return false;
  }

  static std::shared_ptr<TransformOperation> fromJSIValue(
      jsi::Runtime &rt,
      const jsi::Value &value);
  jsi::Value toJSIValue(jsi::Runtime &rt) const;
  virtual jsi::Value valueToJSIValue(jsi::Runtime &rt) const = 0;

  void assertCanConvertTo(TransformOperationType type) const;
  virtual bool canConvertTo(TransformOperationType type) const;
  virtual std::vector<std::shared_ptr<TransformOperation>> convertTo(
      TransformOperationType type) const;

  virtual TransformMatrix toMatrix() const = 0;
};

using TransformOperations = std::vector<std::shared_ptr<TransformOperation>>;

/**
 * Concrete transform operations
 */
// Perspective
struct PerspectiveOperation final : public TransformOperation {
  const double value;

  explicit PerspectiveOperation(double value);
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
  TransformMatrix toMatrix() const override;
};

// Rotate
struct RotateOperation : public TransformOperation {
  const AngleValue value;

  explicit RotateOperation(const AngleValue &value);
  RotateOperation(TransformOperationType type, const AngleValue &value);
  virtual ~RotateOperation() = default;
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
  TransformMatrix toMatrix() const override;
};

struct RotateXOperation final : public RotateOperation {
  explicit RotateXOperation(const AngleValue &value);
  TransformMatrix toMatrix() const override;
};

struct RotateYOperation final : public RotateOperation {
  explicit RotateYOperation(const AngleValue &value);
  TransformMatrix toMatrix() const override;
};

struct RotateZOperation final : public RotateOperation {
  explicit RotateZOperation(const AngleValue &value);
  bool canConvertTo(TransformOperationType type) const override;
  TransformOperations convertTo(TransformOperationType type) const override;
  TransformMatrix toMatrix() const override;
};

// Scale
struct ScaleOperation : public TransformOperation {
  const double value;

  explicit ScaleOperation(double value);
  ScaleOperation(TransformOperationType type, double value);
  virtual ~ScaleOperation() = default;
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
  bool canConvertTo(TransformOperationType type) const final;
  TransformOperations convertTo(TransformOperationType type) const final;
  TransformMatrix toMatrix() const override;
};

struct ScaleXOperation final : public ScaleOperation {
  explicit ScaleXOperation(double value);
  TransformMatrix toMatrix() const override;
};

struct ScaleYOperation final : public ScaleOperation {
  ScaleYOperation(double value);
  TransformMatrix toMatrix() const override;
};

// Translate
struct TranslateOperation : public TransformOperation {
  const UnitValue value;

  TranslateOperation(TransformOperationType type, const UnitValue &value);
  virtual ~TranslateOperation() = default;
  bool isRelative() const override;
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
  virtual TransformMatrix toMatrix(double resolvedValue) const = 0;
  TransformMatrix toMatrix() const override;
};

struct TranslateXOperation final : public TranslateOperation {
  explicit TranslateXOperation(const UnitValue &value);
  TransformMatrix toMatrix(double resolvedValue) const override;
};

struct TranslateYOperation final : public TranslateOperation {
  explicit TranslateYOperation(const UnitValue &value);
  TransformMatrix toMatrix(double resolvedValue) const override;
};

// Skew
struct SkewOperation : public TransformOperation {
  const AngleValue value;

  SkewOperation(TransformOperationType type, const AngleValue &value);
  virtual ~SkewOperation() = default;
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
};

struct SkewXOperation final : public SkewOperation {
  explicit SkewXOperation(const AngleValue &value);
  TransformMatrix toMatrix() const override;
};

struct SkewYOperation final : public SkewOperation {
  explicit SkewYOperation(const AngleValue &value);
  TransformMatrix toMatrix() const override;
};

// Matrix
struct MatrixOperation final : public TransformOperation {
  const std::variant<TransformMatrix, TransformOperations> valueOrOperations;

  explicit MatrixOperation(const TransformMatrix &value);
  explicit MatrixOperation(const TransformOperations &operations);

  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
  TransformMatrix toMatrix() const override;
};

} // namespace reanimated
