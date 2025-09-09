#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

#include <reanimated/CSS/interpolation/transforms/operations/matrix.h>
#include <reanimated/CSS/interpolation/transforms/operations/perspective.h>
#include <reanimated/CSS/interpolation/transforms/operations/rotate.h>
#include <reanimated/CSS/interpolation/transforms/operations/scale.h>
#include <reanimated/CSS/interpolation/transforms/operations/skew.h>
#include <reanimated/CSS/interpolation/transforms/operations/translate.h>

namespace reanimated::css {

#ifndef NDEBUG

std::ostream &operator<<(
    std::ostream &os,
    const TransformOperation &operation) {
  os << operation.getOperationName() << "("
     << operation.stringifyOperationValue() << ")";
  return os;
}

#endif // NDEBUG

bool TransformOperation::canConvertTo(const TransformOp targetType) const {
  return false;
}

void TransformOperation::assertCanConvertTo(
    const TransformOp targetType) const {
  if (!canConvertTo(targetType)) {
    throw std::invalid_argument(
        "[Reanimated] Cannot convert transform operation to type: " +
        getOperationNameFromType(targetType));
  }
}

TransformOperations TransformOperation::convertTo(
    const TransformOp targetType) const {
  throw std::invalid_argument(
      "[Reanimated] Cannot convert transform operation to type: " +
      getOperationNameFromType(targetType));
}

std::string TransformOperation::getOperationName() const {
  return getOperationNameFromType(type());
}

bool TransformOperation::isRelative() const {
  return false;
}

std::shared_ptr<TransformOperation> TransformOperation::fromJSIValue(
    jsi::Runtime &rt,
    const jsi::Value &value) {
  if (!value.isObject()) {
    throw std::invalid_argument(
        "[Reanimated] TransformOperation must be an object.");
  }

  jsi::Object obj = value.asObject(rt);
  auto propertyNames = obj.getPropertyNames(rt);

  if (propertyNames.size(rt) != 1) {
    throw std::invalid_argument(
        "[Reanimated] TransformOperation must have exactly one property.");
  }

  const auto propertyName =
      propertyNames.getValueAtIndex(rt, 0).asString(rt).utf8(rt);
  const auto propertyValue =
      obj.getProperty(rt, jsi::PropNameID::forUtf8(rt, propertyName));
  TransformOp operationType = getTransformOperationType(propertyName);

  switch (operationType) {
    case TransformOp::Perspective:
      return std::make_shared<PerspectiveOperation>(propertyValue.asNumber());
    case TransformOp::Rotate:
      return std::make_shared<RotateOperation>(
          propertyValue.asString(rt).utf8(rt));
    case TransformOp::RotateX:
      return std::make_shared<RotateXOperation>(
          propertyValue.asString(rt).utf8(rt));
    case TransformOp::RotateY:
      return std::make_shared<RotateYOperation>(
          propertyValue.asString(rt).utf8(rt));
    case TransformOp::RotateZ:
      return std::make_shared<RotateZOperation>(
          propertyValue.asString(rt).utf8(rt));
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
      return std::make_shared<TranslateXOperation>(
          propertyValue.asString(rt).utf8(rt));
    }
    case TransformOp::TranslateY: {
      if (propertyValue.isNumber()) {
        return std::make_shared<TranslateYOperation>(propertyValue.asNumber());
      }
      return std::make_shared<TranslateYOperation>(
          propertyValue.asString(rt).utf8(rt));
    }
    case TransformOp::SkewX:
      return std::make_shared<SkewXOperation>(
          propertyValue.asString(rt).utf8(rt));
    case TransformOp::SkewY:
      return std::make_shared<SkewYOperation>(
          propertyValue.asString(rt).utf8(rt));
    case TransformOp::Matrix:
      return std::make_shared<MatrixOperation>(
          TransformMatrix3D(rt, propertyValue));
    default:
      throw std::invalid_argument(
          "[Reanimated] Unknown transform operation: " + propertyName);
  }
}

std::shared_ptr<TransformOperation> TransformOperation::fromDynamic(
    const folly::dynamic &value) {
  if (!value.isObject()) {
    throw std::invalid_argument(
        "[Reanimated] TransformOperation must be an object.");
  }

  auto &obj = value;
  if (obj.size() != 1) {
    throw std::invalid_argument(
        "[Reanimated] TransformOperation must have exactly one property.");
  }

  auto propertyName = obj.items().begin()->first.getString();
  auto propertyValue = obj.items().begin()->second;
  TransformOp operationType = getTransformOperationType(propertyName);

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
      return std::make_shared<MatrixOperation>(
          TransformMatrix3D(propertyValue));
    default:
      throw std::invalid_argument(
          "[Reanimated] Unknown transform operation: " + propertyName);
  }
}

folly::dynamic TransformOperation::toDynamic() const {
  return folly::dynamic::object(getOperationName(), valueToDynamic());
}

// Specialization for the matrix operation
#ifndef NDEBUG

template <TransformOp TOperation, typename TValue>
std::string
TransformOperationBase<TOperation, TValue>::stringifyOperationValue() const {
  std::ostringstream ss;
  ss << value;
  return ss.str();
}

template <>
std::string TransformOperationBase<
    TransformOp::Matrix,
    std::variant<TransformMatrix3D, TransformOperations>>::
    stringifyOperationValue() const {
  std::ostringstream ss;

  if (std::holds_alternative<TransformMatrix3D>(value)) {
    ss << std::get<TransformMatrix3D>(value);
  } else {
    const auto &operations = std::get<TransformOperations>(value);
    std::ostringstream ss;
    for (const auto &operation : operations) {
      ss << operation->getOperationName() << "("
         << operation->stringifyOperationValue() << "), ";
    }
  }

  return ss.str();
}

#endif // NDEBUG

template struct TransformOperationBase<
    TransformOp::Matrix,
    std::variant<TransformMatrix3D, TransformOperations>>;

} // namespace reanimated::css
