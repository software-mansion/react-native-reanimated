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

std::string getOperationNameFromType(const TransformOperationType type) {
  return transformOperationStrings[static_cast<size_t>(type)];
}

TransformOperation::TransformOperation(const TransformOperationType type)
    : type(type) {}

std::ostream &operator<<(
    std::ostream &os,
    const TransformOperation &operation) {
  os << operation.getOperationName();
  return os;
}

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
  const auto &value = valueToJSIValue(rt);
  if (value.isUndefined()) {
    return jsi::Value::undefined();
  }

  jsi::Object obj(rt);
  obj.setProperty(
      rt, jsi::String::createFromUtf8(rt, getOperationName()), value);
  return obj;
}

/**
 * Concrete transform operations
 */

// Perspective
PerspectiveOperation::PerspectiveOperation(const double value)
    : TransformOperation(TransformOperationType::Perspective), value(value) {}
jsi::Value PerspectiveOperation::valueToJSIValue(jsi::Runtime &rt) const {
  // Perspective cannot be 0, so we return undefined in this case
  return value != 0 ? jsi::Value(value) : jsi::Value::undefined();
}
TransformMatrix PerspectiveOperation::toMatrix() const {
  return TransformMatrix::Perspective(value);
}

// Rotate
RotateOperation::RotateOperation(const AngleValue &value)
    : TransformOperation(TransformOperationType::Rotate), value(value) {}
RotateOperation::RotateOperation(
    const TransformOperationType type,
    const AngleValue &value)
    : TransformOperation(type), value(value) {}
jsi::Value RotateOperation::valueToJSIValue(jsi::Runtime &rt) const {
  return value.toJSIValue(rt);
}
TransformMatrix RotateOperation::toMatrix() const {
  return TransformMatrix::RotateZ(value.value);
}

RotateXOperation::RotateXOperation(const AngleValue &value)
    : RotateOperation(TransformOperationType::RotateX, value) {}
TransformMatrix RotateXOperation::toMatrix() const {
  return TransformMatrix::RotateX(value.value);
}

RotateYOperation::RotateYOperation(const AngleValue &value)
    : RotateOperation(TransformOperationType::RotateY, value) {}
TransformMatrix RotateYOperation::toMatrix() const {
  return TransformMatrix::RotateY(value.value);
}

RotateZOperation::RotateZOperation(const AngleValue &value)
    : RotateOperation(TransformOperationType::RotateZ, value) {}
bool RotateZOperation::canConvertTo(const TransformOperationType type) const {
  return type == TransformOperationType::Rotate;
}
TransformOperations RotateZOperation::convertTo(
    const TransformOperationType type) const {
  assertCanConvertTo(type);
  return {std::make_shared<RotateOperation>(value)};
}
TransformMatrix RotateZOperation::toMatrix() const {
  return TransformMatrix::RotateZ(value.value);
}

// Scale
ScaleOperation::ScaleOperation(const double value)
    : TransformOperation(TransformOperationType::Scale), value(value) {}
ScaleOperation::ScaleOperation(
    const TransformOperationType type,
    const double value)
    : TransformOperation(type), value(value) {}
jsi::Value ScaleOperation::valueToJSIValue(jsi::Runtime &rt) const {
  return jsi::Value(value);
}
bool ScaleOperation::canConvertTo(const TransformOperationType type) const {
  return type == TransformOperationType::ScaleX ||
      type == TransformOperationType::ScaleY;
}
TransformOperations ScaleOperation::convertTo(
    const TransformOperationType type) const {
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
TransformMatrix ScaleOperation::toMatrix() const {
  return TransformMatrix::Scale(value);
}

ScaleXOperation::ScaleXOperation(const double value)
    : ScaleOperation(TransformOperationType::ScaleX, value) {}
TransformMatrix ScaleXOperation::toMatrix() const {
  return TransformMatrix::ScaleX(value);
}

ScaleYOperation::ScaleYOperation(const double value)
    : ScaleOperation(TransformOperationType::ScaleY, value) {}
TransformMatrix ScaleYOperation::toMatrix() const {
  return TransformMatrix::ScaleY(value);
}

// Translate
TranslateOperation::TranslateOperation(
    const TransformOperationType type,
    const UnitValue &value)
    : TransformOperation(type), value(value) {}
bool TranslateOperation::isRelative() const {
  return value.isRelative;
}
jsi::Value TranslateOperation::valueToJSIValue(jsi::Runtime &rt) const {
  return value.toJSIValue(rt);
}
TransformMatrix TranslateOperation::toMatrix() const {
  return toMatrix(value.value);
}

TranslateXOperation::TranslateXOperation(const UnitValue &value)
    : TranslateOperation(TransformOperationType::TranslateX, value) {}
TransformMatrix TranslateXOperation::toMatrix(
    const double resolvedValue) const {
  if (value.isRelative) {
    throw std::invalid_argument(
        "[Reanimated] Cannot convert relative translateX to the matrix.");
  }
  return TransformMatrix::TranslateX(resolvedValue);
}

TranslateYOperation::TranslateYOperation(const UnitValue &value)
    : TranslateOperation(TransformOperationType::TranslateY, value) {}
TransformMatrix TranslateYOperation::toMatrix(
    const double resolvedValue) const {
  if (value.isRelative) {
    throw std::invalid_argument(
        "[Reanimated] Cannot convert relative translateY to the matrix.");
  }
  return TransformMatrix::TranslateY(resolvedValue);
}

// Skew
SkewOperation::SkewOperation(
    const TransformOperationType type,
    const AngleValue &value)
    : TransformOperation(type), value(value) {}
jsi::Value SkewOperation::valueToJSIValue(jsi::Runtime &rt) const {
  return value.toJSIValue(rt);
}

SkewXOperation::SkewXOperation(const AngleValue &value)
    : SkewOperation(TransformOperationType::SkewX, value) {}
TransformMatrix SkewXOperation::toMatrix() const {
  return TransformMatrix::SkewX(value.value);
}

SkewYOperation::SkewYOperation(const AngleValue &value)
    : SkewOperation(TransformOperationType::SkewY, value) {}
TransformMatrix SkewYOperation::toMatrix() const {
  return TransformMatrix::SkewY(value.value);
}

// Matrix
std::variant<TransformMatrix, TransformOperations> simplifyOperations(
    const TransformOperations &operations) {
  TransformOperations reversedOperations;
  TransformMatrix matrix = TransformMatrix::Identity();
  bool hasSimplifications = false;

  for (int i = static_cast<int>(operations.size()) - 1; i >= 0; i--) {
    const auto &operation = operations[i];
    if (!operation->isRelative()) {
      matrix *= operation->toMatrix();
      hasSimplifications = true;
    } else {
      if (hasSimplifications) {
        reversedOperations.emplace_back(
            std::make_shared<MatrixOperation>(matrix));
        matrix = TransformMatrix::Identity();
        hasSimplifications = false;
      }
      reversedOperations.emplace_back(operation);
    }
  }

  if (hasSimplifications) {
    if (reversedOperations.empty()) {
      return matrix;
    }

    reversedOperations.emplace_back(std::make_shared<MatrixOperation>(matrix));
  }

  TransformOperations simplifiedOperations;
  simplifiedOperations.reserve(reversedOperations.size());
  for (int i = static_cast<int>(reversedOperations.size()) - 1; i >= 0; i--) {
    simplifiedOperations.emplace_back(reversedOperations[i]);
  }

  return simplifiedOperations;
}

MatrixOperation::MatrixOperation(const TransformMatrix &value)
    : TransformOperation(TransformOperationType::Matrix),
      valueOrOperations(value) {}
MatrixOperation::MatrixOperation(const TransformOperations &operations)
    // Simplify operations to reduce the number of matrix multiplications during
    // matrix keyframe interpolation
    : TransformOperation(TransformOperationType::Matrix),
      valueOrOperations(simplifyOperations(operations)) {}
jsi::Value MatrixOperation::valueToJSIValue(jsi::Runtime &rt) const {
  if (!std::holds_alternative<TransformMatrix>(valueOrOperations)) {
    throw std::invalid_argument(
        "[Reanimated] Cannot convert unprocessed transform operations to the JSI value.");
  }
  return std::get<TransformMatrix>(valueOrOperations).toJSIValue(rt);
}
TransformMatrix MatrixOperation::toMatrix() const {
  if (!std::holds_alternative<TransformMatrix>(valueOrOperations)) {
    throw std::invalid_argument(
        "[Reanimated] Cannot convert unprocessed transform operations to the matrix.");
  }
  return std::get<TransformMatrix>(valueOrOperations);
}

} // namespace reanimated
