#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

namespace reanimated {

constexpr std::array<const char *, 14> transformOperationStrings = {
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
    "matrix",
    "unknown"};

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
          {"matrix", TransformOperationType::Matrix},
          {"unknown", TransformOperationType::Unknown}};

  auto it = stringToEnumMap.find(property);
  if (it != stringToEnumMap.end()) {
    return it->second;
  } else {
    return TransformOperationType::Unknown;
  }
}

bool TransformOperation::canConvertTo(TransformOperationType type) const {
  return false;
}

void TransformOperation::assertCanConvertTo(TransformOperationType type) const {
  if (!canConvertTo(type)) {
    throw std::invalid_argument(
        "[Reanimated] Cannot convert transform operation to type: " +
        getOperationName(type));
  }
}

TransformOperations TransformOperation::convertTo(
    TransformOperationType type) const {
  throw std::invalid_argument(
      "[Reanimated] Cannot convert transform operation to type: " +
      getOperationName(type));
}

std::string TransformOperation::getOperationName(TransformOperationType type) {
  return transformOperationStrings[static_cast<size_t>(type)];
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

  std::string property =
      propertyNames.getValueAtIndex(rt, 0).asString(rt).utf8(rt);
  TransformOperationType operationType = getTransformOperationType(property);

  switch (operationType) {
    case TransformOperationType::Perspective:
      return std::make_shared<PerspectiveOperation>(
          obj.getProperty(rt, "perspective").asNumber());
    case TransformOperationType::Rotate:
      return std::make_shared<RotateOperation>(
          AngleValue(rt, obj.getProperty(rt, "rotate")));
    case TransformOperationType::RotateX:
      return std::make_shared<RotateXOperation>(
          AngleValue(rt, obj.getProperty(rt, "rotateX")));
    case TransformOperationType::RotateY:
      return std::make_shared<RotateYOperation>(
          AngleValue(rt, obj.getProperty(rt, "rotateY")));
    case TransformOperationType::RotateZ:
      return std::make_shared<RotateZOperation>(
          AngleValue(rt, obj.getProperty(rt, "rotateZ")));
    case TransformOperationType::Scale:
      return std::make_shared<ScaleOperation>(
          obj.getProperty(rt, "scale").asNumber());
    case TransformOperationType::ScaleX:
      return std::make_shared<ScaleXOperation>(
          obj.getProperty(rt, "scaleX").asNumber());
    case TransformOperationType::ScaleY:
      return std::make_shared<ScaleYOperation>(
          obj.getProperty(rt, "scaleY").asNumber());
    case TransformOperationType::TranslateX:
      return std::make_shared<TranslateXOperation>(
          UnitValue(rt, obj.getProperty(rt, "translateX")));
    case TransformOperationType::TranslateY:
      return std::make_shared<TranslateYOperation>(
          UnitValue(rt, obj.getProperty(rt, "translateY")));
    case TransformOperationType::SkewX:
      return std::make_shared<SkewXOperation>(
          AngleValue(rt, obj.getProperty(rt, "skewX")));
    case TransformOperationType::SkewY:
      return std::make_shared<SkewYOperation>(
          AngleValue(rt, obj.getProperty(rt, "skewY")));
    case TransformOperationType::Matrix:
      return std::make_shared<MatrixOperation>(
          TransformMatrix(rt, obj.getProperty(rt, "matrix")));
    default:
      throw std::invalid_argument(
          "[Reanimated] Unknown transform operation: " + property);
  }
}

jsi::Value TransformOperation::toJSIValue(jsi::Runtime &rt) const {
  jsi::Object obj(rt);
  obj.setProperty(
      rt,
      jsi::String::createFromUtf8(rt, getOperationName(getType())),
      valueToJSIValue(rt));
  return obj;
}

/**
 * Concrete transform operations
 */
// Perspective
PerspectiveOperation::PerspectiveOperation(double value) : value(value) {}
TransformOperationType PerspectiveOperation::getType() const {
  return TransformOperationType::Perspective;
}
jsi::Value PerspectiveOperation::valueToJSIValue(jsi::Runtime &rt) const {
  return jsi::Value(value);
}

// Rotate
RotateOperation::RotateOperation(const AngleValue &value) : value(value) {}
TransformOperationType RotateOperation::getType() const {
  return TransformOperationType::Rotate;
}
jsi::Value RotateOperation::valueToJSIValue(jsi::Runtime &rt) const {
  return value.toJSIValue(rt);
}

// Derived RotateXOperation
TransformOperationType RotateXOperation::getType() const {
  return TransformOperationType::RotateX;
}

// Derived RotateYOperation
TransformOperationType RotateYOperation::getType() const {
  return TransformOperationType::RotateY;
}

// Derived RotateZOperation
TransformOperationType RotateZOperation::getType() const {
  return TransformOperationType::RotateZ;
}
bool RotateZOperation::canConvertTo(TransformOperationType type) const {
  return type == TransformOperationType::Rotate;
}
TransformOperations RotateZOperation::convertTo(
    TransformOperationType type) const {
  assertCanConvertTo(type);
  return {std::make_shared<RotateOperation>(value)};
}

// Scale
ScaleOperation::ScaleOperation(double value) : value(value) {}
TransformOperationType ScaleOperation::getType() const {
  return TransformOperationType::Scale;
}
jsi::Value ScaleOperation::valueToJSIValue(jsi::Runtime &rt) const {
  return jsi::Value(value);
}
bool ScaleOperation::canConvertTo(TransformOperationType type) const {
  return type == TransformOperationType::ScaleX ||
      type == TransformOperationType::ScaleY;
}
TransformOperations ScaleOperation::convertTo(
    TransformOperationType type) const {
  assertCanConvertTo(type);

  if (type == TransformOperationType::ScaleX) {
    return {
        std::make_shared<ScaleXOperation>(value),
        std::make_shared<ScaleYOperation>(value)};
  } else {
    return {
        std::make_shared<ScaleYOperation>(value),
        std::make_shared<ScaleXOperation>(value)};
  }
}

// Derived ScaleXOperation
TransformOperationType ScaleXOperation::getType() const {
  return TransformOperationType::ScaleX;
}

// Derived ScaleYOperation
TransformOperationType ScaleYOperation::getType() const {
  return TransformOperationType::ScaleY;
}

// Translate
TranslateXOperation::TranslateXOperation(const UnitValue &value)
    : value(value) {}
TransformOperationType TranslateXOperation::getType() const {
  return TransformOperationType::TranslateX;
}
jsi::Value TranslateXOperation::valueToJSIValue(jsi::Runtime &rt) const {
  return value.toJSIValue(rt);
}

TranslateYOperation::TranslateYOperation(const UnitValue &value)
    : value(value) {}
TransformOperationType TranslateYOperation::getType() const {
  return TransformOperationType::TranslateY;
}
jsi::Value TranslateYOperation::valueToJSIValue(jsi::Runtime &rt) const {
  return value.toJSIValue(rt);
}

// Skew
SkewXOperation::SkewXOperation(const AngleValue &value) : value(value) {}
TransformOperationType SkewXOperation::getType() const {
  return TransformOperationType::SkewX;
}
jsi::Value SkewXOperation::valueToJSIValue(jsi::Runtime &rt) const {
  return value.toJSIValue(rt);
}

SkewYOperation::SkewYOperation(const AngleValue &value) : value(value) {}
TransformOperationType SkewYOperation::getType() const {
  return TransformOperationType::SkewY;
}
jsi::Value SkewYOperation::valueToJSIValue(jsi::Runtime &rt) const {
  return value.toJSIValue(rt);
}

// Matrix
MatrixOperation::MatrixOperation(const TransformMatrix &value) : value(value) {}
MatrixOperation::MatrixOperation(const TransformOperations &operations)
    : operations(operations) {}
TransformOperationType MatrixOperation::getType() const {
  return TransformOperationType::Matrix;
}
jsi::Value MatrixOperation::valueToJSIValue(jsi::Runtime &rt) const {
  return value.toJSIValue(rt);
}

} // namespace reanimated
