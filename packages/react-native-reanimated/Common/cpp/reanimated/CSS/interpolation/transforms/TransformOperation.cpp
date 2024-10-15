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

std::string TransformOperation::getOperationName(TransformOperationType type) {
  return transformOperationStrings[static_cast<size_t>(type)];
}

std::unique_ptr<TransformOperation> TransformOperation::fromJSIValue(
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
    case TransformOperationType::TranslateX:
      return std::make_unique<TranslateXOperation>(
          UnitValue(rt, obj.getProperty(rt, "translateX")));
    case TransformOperationType::TranslateY:
      return std::make_unique<TranslateYOperation>(
          UnitValue(rt, obj.getProperty(rt, "translateY")));
    case TransformOperationType::Rotate:
      return std::make_unique<RotateOperation>(
          AngleValue(rt, obj.getProperty(rt, "rotate")));
    case TransformOperationType::RotateX:
      return std::make_unique<RotateXOperation>(
          AngleValue(rt, obj.getProperty(rt, "rotateX")));
    case TransformOperationType::RotateY:
      return std::make_unique<RotateYOperation>(
          AngleValue(rt, obj.getProperty(rt, "rotateY")));
    case TransformOperationType::RotateZ:
      return std::make_unique<RotateZOperation>(
          AngleValue(rt, obj.getProperty(rt, "rotateZ")));
    case TransformOperationType::Scale:
      return std::make_unique<ScaleOperation>(
          obj.getProperty(rt, "scale").asNumber());
    case TransformOperationType::ScaleX:
      return std::make_unique<ScaleXOperation>(
          obj.getProperty(rt, "scaleX").asNumber());
    case TransformOperationType::ScaleY:
      return std::make_unique<ScaleYOperation>(
          obj.getProperty(rt, "scaleY").asNumber());
    default:
      throw std::invalid_argument("Unknown transform operation: " + property);
  }
}

jsi::Value TransformOperation::toJSIValue(jsi::Runtime &rt) const {
  jsi::Object obj(rt);
  obj.setProperty(
      rt, "type", jsi::String::createFromUtf8(rt, getOperationName(getType())));
  obj.setProperty(rt, "value", valueToJSIValue(rt));
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
RotateXOperation::RotateXOperation(const AngleValue &value)
    : RotateOperation(value) {}
TransformOperationType RotateXOperation::getType() const {
  return TransformOperationType::RotateX;
}

// Derived RotateYOperation
RotateYOperation::RotateYOperation(const AngleValue &value)
    : RotateOperation(value) {}
TransformOperationType RotateYOperation::getType() const {
  return TransformOperationType::RotateY;
}

// Derived RotateZOperation
RotateZOperation::RotateZOperation(const AngleValue &value)
    : RotateOperation(value) {}
TransformOperationType RotateZOperation::getType() const {
  return TransformOperationType::RotateZ;
}

// Scale
ScaleOperation::ScaleOperation(double value) : value(value) {}
TransformOperationType ScaleOperation::getType() const {
  return TransformOperationType::Scale;
}
jsi::Value ScaleOperation::valueToJSIValue(jsi::Runtime &rt) const {
  return jsi::Value(value);
}

// Derived ScaleXOperation
ScaleXOperation::ScaleXOperation(double value) : ScaleOperation(value) {}
TransformOperationType ScaleXOperation::getType() const {
  return TransformOperationType::ScaleX;
}

// Derived ScaleYOperation
ScaleYOperation::ScaleYOperation(double value) : ScaleOperation(value) {}
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
MatrixOperation::MatrixOperation(const MatrixArray &value) : value(value) {}
TransformOperationType MatrixOperation::getType() const {
  return TransformOperationType::Matrix;
}
jsi::Value MatrixOperation::valueToJSIValue(jsi::Runtime &rt) const {
  jsi::Array array(rt, 16);
  for (size_t i = 0; i < 16; ++i) {
    array.setValueAtIndex(rt, i, value[i]);
  }
  return array;
}

} // namespace reanimated
