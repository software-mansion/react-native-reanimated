#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

#include <reanimated/CSS/common/transforms/TransformMatrix2D.h>
#include <reanimated/CSS/common/transforms/TransformMatrix3D.h>
#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/common/values/CSSLength.h>
#include <reanimated/CSS/common/values/CSSNumber.h>

#include <reanimated/CSS/interpolation/transforms/operations/matrix.h>
#include <reanimated/CSS/interpolation/transforms/operations/perspective.h>
#include <reanimated/CSS/interpolation/transforms/operations/rotate.h>
#include <reanimated/CSS/interpolation/transforms/operations/scale.h>
#include <reanimated/CSS/interpolation/transforms/operations/skew.h>
#include <reanimated/CSS/interpolation/transforms/operations/translate.h>

#include <utility>

namespace reanimated::css {

std::string createConversionErrorMessage(const TransformOp fromType, const TransformOp toType) {
  return "[Reanimated] Cannot convert transform operation of type: " + getTransformOperationName(fromType) +
      " to type: " + getTransformOperationName(toType);
}

TransformOperation::TransformOperation(TransformOp type) : StyleOperation(static_cast<uint8_t>(type)) {}

bool TransformOperation::canConvertTo(const TransformOp targetType) const {
  return false;
}

void TransformOperation::assertCanConvertTo(const TransformOp targetType) const {
  if (!canConvertTo(targetType)) {
    throw std::invalid_argument(createConversionErrorMessage(static_cast<TransformOp>(type), targetType));
  }
}

TransformOperations TransformOperation::convertTo(const TransformOp targetType) const {
  throw std::invalid_argument(createConversionErrorMessage(static_cast<TransformOp>(type), targetType));
}

std::string TransformOperation::getOperationName() const {
  return getTransformOperationName(static_cast<TransformOp>(type));
}

bool TransformOperation::is3D() const {
  return false;
}

std::shared_ptr<TransformOperation> TransformOperation::fromJSIValue(jsi::Runtime &rt, const jsi::Value &value) {
  if (!value.isObject()) {
    throw std::invalid_argument("[Reanimated] TransformOperation must be an object.");
  }

  jsi::Object obj = value.asObject(rt);
  auto propertyNames = obj.getPropertyNames(rt);

  if (propertyNames.size(rt) != 1) {
    throw std::invalid_argument("[Reanimated] TransformOperation must have exactly one property.");
  }

  const auto propertyName = propertyNames.getValueAtIndex(rt, 0).asString(rt).utf8(rt);
  const auto propertyValue = obj.getProperty(rt, jsi::PropNameID::forUtf8(rt, propertyName));
  const TransformOp operationType = getTransformOperationType(propertyName);

  switch (operationType) {
    case TransformOp::Perspective:
      return std::make_shared<PerspectiveOperation>(propertyValue.asNumber());
    case TransformOp::Rotate:
      return std::make_shared<RotateOperation>(propertyValue.asString(rt).utf8(rt));
    case TransformOp::RotateX:
      return std::make_shared<RotateXOperation>(propertyValue.asString(rt).utf8(rt));
    case TransformOp::RotateY:
      return std::make_shared<RotateYOperation>(propertyValue.asString(rt).utf8(rt));
    case TransformOp::RotateZ:
      return std::make_shared<RotateZOperation>(propertyValue.asString(rt).utf8(rt));
    case TransformOp::Scale:
      return std::make_shared<ScaleOperation>(propertyValue.asNumber());
    case TransformOp::ScaleX:
      return std::make_shared<ScaleXOperation>(propertyValue.asNumber());
    case TransformOp::ScaleY:
      return std::make_shared<ScaleYOperation>(propertyValue.asNumber());
    case TransformOp::TranslateX: {
      if (propertyValue.isNumber()) {
        return std::make_shared<TranslateXOperation>(propertyValue.asNumber());
      }
      return std::make_shared<TranslateXOperation>(propertyValue.asString(rt).utf8(rt));
    }
    case TransformOp::TranslateY: {
      if (propertyValue.isNumber()) {
        return std::make_shared<TranslateYOperation>(propertyValue.asNumber());
      }
      return std::make_shared<TranslateYOperation>(propertyValue.asString(rt).utf8(rt));
    }
    case TransformOp::SkewX:
      return std::make_shared<SkewXOperation>(propertyValue.asString(rt).utf8(rt));
    case TransformOp::SkewY:
      return std::make_shared<SkewYOperation>(propertyValue.asString(rt).utf8(rt));
    case TransformOp::Matrix:
      return std::make_shared<MatrixOperation>(rt, propertyValue);
    default:
      throw std::invalid_argument("[Reanimated] Unknown transform operation: " + propertyName);
  }
}

std::shared_ptr<TransformOperation> TransformOperation::fromDynamic(const folly::dynamic &value) {
  if (!value.isObject()) {
    throw std::invalid_argument("[Reanimated] TransformOperation must be an object.");
  }

  auto &obj = value;
  if (obj.size() != 1) {
    throw std::invalid_argument("[Reanimated] TransformOperation must have exactly one property.");
  }

  auto propertyName = obj.items().begin()->first.getString();
  auto propertyValue = obj.items().begin()->second;
  const TransformOp operationType = getTransformOperationType(propertyName);

  switch (operationType) {
    case TransformOp::Perspective:
      return std::make_shared<PerspectiveOperation>(propertyValue.getDouble());
    case TransformOp::Rotate:
      return std::make_shared<RotateOperation>(propertyValue.getString());
    case TransformOp::RotateX:
      return std::make_shared<RotateXOperation>(propertyValue.getString());
    case TransformOp::RotateY:
      return std::make_shared<RotateYOperation>(propertyValue.getString());
    case TransformOp::RotateZ:
      return std::make_shared<RotateZOperation>(propertyValue.getString());
    case TransformOp::Scale:
      return std::make_shared<ScaleOperation>(propertyValue.getDouble());
    case TransformOp::ScaleX:
      return std::make_shared<ScaleXOperation>(propertyValue.getDouble());
    case TransformOp::ScaleY:
      return std::make_shared<ScaleYOperation>(propertyValue.getDouble());
    case TransformOp::TranslateX: {
      if (propertyValue.isNumber()) {
        return std::make_shared<TranslateXOperation>(propertyValue.getDouble());
      }
      return std::make_shared<TranslateXOperation>(propertyValue.getString());
    }
    case TransformOp::TranslateY: {
      if (propertyValue.isNumber()) {
        return std::make_shared<TranslateYOperation>(propertyValue.getDouble());
      }
      return std::make_shared<TranslateYOperation>(propertyValue.getString());
    }
    case TransformOp::SkewX:
      return std::make_shared<SkewXOperation>(propertyValue.getString());
    case TransformOp::SkewY:
      return std::make_shared<SkewYOperation>(propertyValue.getString());
    case TransformOp::Matrix:
      return std::make_shared<MatrixOperation>(propertyValue);
    default:
      throw std::invalid_argument("[Reanimated] Unknown transform operation: " + propertyName);
  }
}

// TransformOperationBase implementation
template <TransformOp TOperation, typename TValue>
TransformOperationBase<TOperation, TValue>::TransformOperationBase(TValue value)
    : TransformOperation(TOperation), value(std::move(value)) {}

template <TransformOp TOperation, typename TValue>
TransformMatrix::Shared TransformOperationBase<TOperation, TValue>::toMatrix(bool force3D) const {
  if constexpr (Resolvable<TValue>) {
    // Handle resolvable operations
    throw std::runtime_error("[Reanimated] Cannot convert resolvable operation to matrix: " + getOperationName());
  } else {
    // Handle regular operations
    const auto shouldBe3D = this->is3D() || force3D;

    if (cachedMatrix_) {
      const auto resultDimension = shouldBe3D ? MATRIX_3D_DIMENSION : MATRIX_2D_DIMENSION;
      if (cachedMatrix_->getDimension() == resultDimension) {
        return cachedMatrix_;
      }
    }

    TransformMatrix::Shared result;
    if (shouldBe3D) {
      result = std::make_shared<const TransformMatrix3D>(TransformMatrix3D::create<TOperation>(this->value.value));
    } else {
      result = std::make_shared<const TransformMatrix2D>(TransformMatrix2D::create<TOperation>(this->value.value));
    }

    cachedMatrix_ = result;
    return result;
  }
}

template <TransformOp TOperation, typename TValue>
folly::dynamic TransformOperationBase<TOperation, TValue>::valueToDynamic() const {
  return value.toDynamic();
}

template <TransformOp TOperation, typename TValue>
bool TransformOperationBase<TOperation, TValue>::areValuesEqual(const StyleOperation &other) const {
  return value == static_cast<const TransformOperationBase<TOperation, TValue> &>(other).value;
}

// Rotate operations
template struct TransformOperationBase<TransformOp::Rotate, CSSAngle>;
template struct TransformOperationBase<TransformOp::RotateZ, CSSAngle>;
template struct TransformOperationBase<TransformOp::RotateX, CSSAngle>;
template struct TransformOperationBase<TransformOp::RotateY, CSSAngle>;

// Translate operations
template struct TransformOperationBase<TransformOp::TranslateX, CSSLength>;
template struct TransformOperationBase<TransformOp::TranslateY, CSSLength>;

// Scale operations
template struct TransformOperationBase<TransformOp::ScaleX, CSSDouble>;
template struct TransformOperationBase<TransformOp::ScaleY, CSSDouble>;
template struct TransformOperationBase<TransformOp::Scale, CSSDouble>;

// Skew operations
template struct TransformOperationBase<TransformOp::SkewX, CSSAngle>;
template struct TransformOperationBase<TransformOp::SkewY, CSSAngle>;

// Perspective operation
template struct TransformOperationBase<TransformOp::Perspective, CSSDouble>;

} // namespace reanimated::css
