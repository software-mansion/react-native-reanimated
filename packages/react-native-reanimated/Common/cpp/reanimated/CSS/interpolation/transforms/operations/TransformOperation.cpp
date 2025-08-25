#include <reanimated/CSS/interpolation/transforms/operations/TransformOperation.h>

#include <reanimated/CSS/interpolation/transforms/operations/matrix.h>
#include <reanimated/CSS/interpolation/transforms/operations/perspective.h>
#include <reanimated/CSS/interpolation/transforms/operations/rotate.h>
#include <reanimated/CSS/interpolation/transforms/operations/scale.h>
#include <reanimated/CSS/interpolation/transforms/operations/skew.h>
#include <reanimated/CSS/interpolation/transforms/operations/translate.h>

namespace reanimated::css {

constexpr std::array<const char *, 13> transformOperationStrings = {
    "perspective",
    "rotate",
    "rotateX",
    "rotateY",
    "rotateZ",
    "scale",
    "scaleX",
    "scaleY",
    "translateX",
    "translateY",
    "skewX",
    "skewY",
    "matrix"};

TransformOperationType getTransformOperationType(const std::string &property) {
  static const std::unordered_map<std::string, TransformOperationType>
      stringToEnumMap = {
          {"perspective", TransformOperationType::Perspective},
          {"rotate", TransformOperationType::Rotate},
          {"rotateX", TransformOperationType::RotateX},
          {"rotateY", TransformOperationType::RotateY},
          {"rotateZ", TransformOperationType::RotateZ},
          {"scale", TransformOperationType::Scale},
          {"scaleX", TransformOperationType::ScaleX},
          {"scaleY", TransformOperationType::ScaleY},
          {"translateX", TransformOperationType::TranslateX},
          {"translateY", TransformOperationType::TranslateY},
          {"skewX", TransformOperationType::SkewX},
          {"skewY", TransformOperationType::SkewY},
          {"matrix", TransformOperationType::Matrix}};

  auto it = stringToEnumMap.find(property);
  if (it != stringToEnumMap.end()) {
    return it->second;
  } else {
    throw std::invalid_argument(
        "[Reanimated] Unknown transform operation: " + property);
  }
}

std::string getOperationNameFromType(const TransformOperationType type) {
  return transformOperationStrings[static_cast<size_t>(type)];
}

#ifndef NDEBUG

std::ostream &operator<<(
    std::ostream &os,
    const TransformOperation &operation) {
  os << operation.getOperationName() << "("
     << operation.stringifyOperationValue() << ")";
  return os;
}

#endif // NDEBUG

bool TransformOperation::canConvertTo(
    const TransformOperationType targetType) const {
  return false;
}

void TransformOperation::assertCanConvertTo(
    const TransformOperationType targetType) const {
  if (!canConvertTo(targetType)) {
    throw std::invalid_argument(
        "[Reanimated] Cannot convert transform operation to type: " +
        getOperationNameFromType(targetType));
  }
}

TransformOperations TransformOperation::convertTo(
    const TransformOperationType targetType) const {
  throw std::invalid_argument(
      "[Reanimated] Cannot convert transform operation to type: " +
      getOperationNameFromType(targetType));
}

std::string TransformOperation::getOperationName() const {
  return transformOperationStrings[static_cast<size_t>(type())];
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
  TransformOperationType operationType =
      getTransformOperationType(propertyName);

  switch (operationType) {
    case TransformOperationType::Perspective:
      return std::make_shared<PerspectiveOperation>(propertyValue.asNumber());
    case TransformOperationType::Rotate:
      return std::make_shared<RotateOperation>(
          propertyValue.asString(rt).utf8(rt));
    case TransformOperationType::RotateX:
      return std::make_shared<RotateXOperation>(
          propertyValue.asString(rt).utf8(rt));
    case TransformOperationType::RotateY:
      return std::make_shared<RotateYOperation>(
          propertyValue.asString(rt).utf8(rt));
    case TransformOperationType::RotateZ:
      return std::make_shared<RotateZOperation>(
          propertyValue.asString(rt).utf8(rt));
    case TransformOperationType::Scale:
      return std::make_shared<ScaleOperation>(propertyValue.asNumber());
    case TransformOperationType::ScaleX:
      return std::make_shared<ScaleXOperation>(propertyValue.asNumber());
    case TransformOperationType::ScaleY:
      return std::make_shared<ScaleYOperation>(propertyValue.asNumber());
    case TransformOperationType::TranslateX: {
      if (propertyValue.isNumber()) {
        return std::make_shared<TranslateXOperation>(propertyValue.asNumber());
      }
      return std::make_shared<TranslateXOperation>(
          propertyValue.asString(rt).utf8(rt));
    }
    case TransformOperationType::TranslateY: {
      if (propertyValue.isNumber()) {
        return std::make_shared<TranslateYOperation>(propertyValue.asNumber());
      }
      return std::make_shared<TranslateYOperation>(
          propertyValue.asString(rt).utf8(rt));
    }
    case TransformOperationType::SkewX:
      return std::make_shared<SkewXOperation>(
          propertyValue.asString(rt).utf8(rt));
    case TransformOperationType::SkewY:
      return std::make_shared<SkewYOperation>(
          propertyValue.asString(rt).utf8(rt));
    case TransformOperationType::Matrix:
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
  TransformOperationType operationType =
      getTransformOperationType(propertyName);

  switch (operationType) {
    case TransformOperationType::Perspective:
      return std::make_shared<PerspectiveOperation>(propertyValue.getDouble());
    case TransformOperationType::Rotate:
      return std::make_shared<RotateOperation>(propertyValue.getString());
    case TransformOperationType::RotateX:
      return std::make_shared<RotateXOperation>(propertyValue.getString());
    case TransformOperationType::RotateY:
      return std::make_shared<RotateYOperation>(propertyValue.getString());
    case TransformOperationType::RotateZ:
      return std::make_shared<RotateZOperation>(propertyValue.getString());
    case TransformOperationType::Scale:
      return std::make_shared<ScaleOperation>(propertyValue.getDouble());
    case TransformOperationType::ScaleX:
      return std::make_shared<ScaleXOperation>(propertyValue.getDouble());
    case TransformOperationType::ScaleY:
      return std::make_shared<ScaleYOperation>(propertyValue.getDouble());
    case TransformOperationType::TranslateX: {
      if (propertyValue.isNumber()) {
        return std::make_shared<TranslateXOperation>(propertyValue.getDouble());
      }
      return std::make_shared<TranslateXOperation>(propertyValue.getString());
    }
    case TransformOperationType::TranslateY: {
      if (propertyValue.isNumber()) {
        return std::make_shared<TranslateYOperation>(propertyValue.getDouble());
      }
      return std::make_shared<TranslateYOperation>(propertyValue.getString());
    }
    case TransformOperationType::SkewX:
      return std::make_shared<SkewXOperation>(propertyValue.getString());
    case TransformOperationType::SkewY:
      return std::make_shared<SkewYOperation>(propertyValue.getString());
    case TransformOperationType::Matrix:
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

template <typename TValue>
std::string TransformOperationBase<TValue>::stringifyOperationValue() const {
  std::ostringstream ss;
  ss << value;
  return ss.str();
}

template <>
std::string
TransformOperationBase<std::variant<TransformMatrix3D, TransformOperations>>::
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

template struct TransformOperationBase<CSSDouble>;
template struct TransformOperationBase<CSSAngle>;
template struct TransformOperationBase<CSSLength>;
template struct TransformOperationBase<
    std::variant<TransformMatrix3D, TransformOperations>>;

} // namespace reanimated::css
