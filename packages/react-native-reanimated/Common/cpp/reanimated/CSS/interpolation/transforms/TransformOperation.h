#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

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
};

TransformOperationType getTransformOperationType(const std::string &property);
std::string getOperationNameFromType(TransformOperationType type);

// Base class for TransformOperation
class TransformOperation {
 public:
  const TransformOperationType type;

  explicit TransformOperation(TransformOperationType type);

  virtual bool operator==(const TransformOperation &other) const = 0;
  friend std::ostream &operator<<(
      std::ostream &os,
      const TransformOperation &operation);

  std::string getOperationName() const;
  virtual std::string getOperationValue() const = 0;
  virtual bool isRelative() const;

  static std::shared_ptr<TransformOperation> fromJSIValue(
      jsi::Runtime &rt,
      const jsi::Value &value);
  jsi::Value toJSIValue(jsi::Runtime &rt) const;
  virtual jsi::Value valueToJSIValue(jsi::Runtime &rt) const = 0;

  virtual bool canConvertTo(TransformOperationType type) const;
  virtual std::vector<std::shared_ptr<TransformOperation>> convertTo(
      TransformOperationType type) const;

  virtual TransformMatrix toMatrix() const = 0;

 protected:
  void assertCanConvertTo(TransformOperationType type) const;
};

using TransformOperations = std::vector<std::shared_ptr<TransformOperation>>;

template <typename T>
class TransformOperationBase : public TransformOperation {
 public:
  const T value;

  bool operator==(const TransformOperation &other) const override;
  std::string getOperationValue() const override;

 protected:
  explicit TransformOperationBase(TransformOperationType type, const T &value);
};

/**
 * Concrete transform operations
 */
// Perspective
class PerspectiveOperation final : public TransformOperationBase<double> {
 public:
  explicit PerspectiveOperation(double value);
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
  TransformMatrix toMatrix() const override;
};

// Rotate
class RotateOperation : public TransformOperationBase<AngleValue> {
 public:
  explicit RotateOperation(const AngleValue &value);
  virtual ~RotateOperation() = default;
  RotateOperation(TransformOperationType type, const AngleValue &value);
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
  TransformMatrix toMatrix() const override;
};

class RotateXOperation final : public RotateOperation {
 public:
  explicit RotateXOperation(const AngleValue &value);
  TransformMatrix toMatrix() const override;
};

class RotateYOperation final : public RotateOperation {
 public:
  explicit RotateYOperation(const AngleValue &value);
  TransformMatrix toMatrix() const override;
};

class RotateZOperation final : public RotateOperation {
 public:
  explicit RotateZOperation(const AngleValue &value);
  bool canConvertTo(TransformOperationType type) const override;
  TransformOperations convertTo(TransformOperationType type) const override;
  TransformMatrix toMatrix() const override;
};

// Scale
class ScaleOperation : public TransformOperationBase<double> {
 public:
  explicit ScaleOperation(double value);
  virtual ~ScaleOperation() = default;

  ScaleOperation(TransformOperationType type, double value);
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
  bool canConvertTo(TransformOperationType type) const final;
  TransformOperations convertTo(TransformOperationType type) const final;
  TransformMatrix toMatrix() const override;
};

class ScaleXOperation final : public ScaleOperation {
 public:
  explicit ScaleXOperation(double value);
  TransformMatrix toMatrix() const override;
};

class ScaleYOperation final : public ScaleOperation {
 public:
  explicit ScaleYOperation(double value);
  TransformMatrix toMatrix() const override;
};

// Translate
class TranslateOperation : public TransformOperationBase<UnitValue> {
 public:
  TranslateOperation(TransformOperationType type, const UnitValue &value);
  bool isRelative() const override;
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
  virtual TransformMatrix toMatrix(double resolvedValue) const = 0;
  TransformMatrix toMatrix() const override;
};

class TranslateXOperation final : public TranslateOperation {
 public:
  explicit TranslateXOperation(const UnitValue &value);
  TransformMatrix toMatrix(double resolvedValue) const override;
};

class TranslateYOperation final : public TranslateOperation {
 public:
  explicit TranslateYOperation(const UnitValue &value);
  TransformMatrix toMatrix(double resolvedValue) const override;
};

// Skew
class SkewOperation : public TransformOperationBase<AngleValue> {
 public:
  SkewOperation(TransformOperationType type, const AngleValue &value);
  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
};

class SkewXOperation final : public SkewOperation {
 public:
  explicit SkewXOperation(const AngleValue &value);
  TransformMatrix toMatrix() const override;
};

class SkewYOperation final : public SkewOperation {
 public:
  explicit SkewYOperation(const AngleValue &value);
  TransformMatrix toMatrix() const override;
};

// Matrix
class MatrixOperation final
    : public TransformOperationBase<
          std::variant<TransformMatrix, TransformOperations>> {
 public:
  explicit MatrixOperation(const TransformMatrix &value);
  explicit MatrixOperation(const TransformOperations &operations);

  bool operator==(const TransformOperation &other) const override;

  jsi::Value valueToJSIValue(jsi::Runtime &rt) const override;
  TransformMatrix toMatrix() const override;
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
