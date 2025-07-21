#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

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
  os << operation.getOperationName() << "(" << operation.getOperationValue()
     << ")";
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
      return std::make_shared<MatrixOperation>(TransformMatrix(propertyValue));
    default:
      throw std::invalid_argument(
          "[Reanimated] Unknown transform operation: " + propertyName);
  }
}

folly::dynamic TransformOperation::toDynamic() const {
  const auto &value = valueToDynamic();
  return folly::dynamic::object(getOperationName(), value);
}

template <typename TValue>
TransformOperationBase<TValue>::TransformOperationBase(const TValue &value)
    : TransformOperation(), value(value) {}

template <typename TValue>
bool TransformOperationBase<TValue>::operator==(
    const TransformOperation &other) const {
  if (type() != other.type()) {
    return false;
  }
  const auto &otherOperation =
      static_cast<const TransformOperationBase<TValue> &>(other);
  return value == otherOperation.value;
}

#ifndef NDEBUG

template <typename TValue>
std::string TransformOperationBase<TValue>::getOperationValue() const {
  std::ostringstream ss;
  ss << value;
  return ss.str();
}

template <>
std::string TransformOperationBase<
    std::variant<TransformMatrix, TransformOperations>>::getOperationValue()
    const {
  if (std::holds_alternative<TransformMatrix>(value)) {
    std::ostringstream ss;
    ss << std::get<TransformMatrix>(value);
    return ss.str();
  }

  const auto &operations = std::get<TransformOperations>(value);
  std::ostringstream ss;
  for (const auto &operation : operations) {
    ss << operation->getOperationName() << "(" << operation->getOperationValue()
       << "), ";
  }
  return ss.str();
}

#endif // NDEBUG

/**
 * Concrete transform operations
 */

// Perspective
PerspectiveOperation::PerspectiveOperation(const double value)
    : TransformOperationBase<CSSDouble>(CSSDouble(value)) {}
TransformOperationType PerspectiveOperation::type() const {
  return TransformOperationType::Perspective;
}
folly::dynamic PerspectiveOperation::valueToDynamic() const {
  // Perspective cannot be 0, so we return undefined in this case
  return value.value != 0 ? value.toDynamic() : folly::dynamic();
}
TransformMatrix PerspectiveOperation::toMatrix() const {
  return TransformMatrix::Perspective(value.value);
}

// Rotate
RotateOperation::RotateOperation(const std::string &value)
    : TransformOperationBase<CSSAngle>(CSSAngle(value)) {}
TransformOperationType RotateOperation::type() const {
  return TransformOperationType::Rotate;
}
folly::dynamic RotateOperation::valueToDynamic() const {
  return value.toDynamic();
}
TransformMatrix RotateOperation::toMatrix() const {
  return TransformMatrix::RotateZ(value.value);
}

TransformOperationType RotateXOperation::type() const {
  return TransformOperationType::RotateX;
}
TransformMatrix RotateXOperation::toMatrix() const {
  return TransformMatrix::RotateX(value.value);
}

TransformOperationType RotateYOperation::type() const {
  return TransformOperationType::RotateY;
}
TransformMatrix RotateYOperation::toMatrix() const {
  return TransformMatrix::RotateY(value.value);
}

TransformOperationType RotateZOperation::type() const {
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
TransformMatrix RotateZOperation::toMatrix() const {
  return TransformMatrix::RotateZ(value.value);
}

// Scale
ScaleOperation::ScaleOperation(const double value)
    : TransformOperationBase<CSSDouble>(CSSDouble(value)) {}
TransformOperationType ScaleOperation::type() const {
  return TransformOperationType::Scale;
}
folly::dynamic ScaleOperation::valueToDynamic() const {
  return value.toDynamic();
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
TransformMatrix ScaleOperation::toMatrix() const {
  return TransformMatrix::Scale(value.value);
}

TransformOperationType ScaleXOperation::type() const {
  return TransformOperationType::ScaleX;
}
TransformMatrix ScaleXOperation::toMatrix() const {
  return TransformMatrix::ScaleX(value.value);
}

TransformOperationType ScaleYOperation::type() const {
  return TransformOperationType::ScaleY;
}
TransformMatrix ScaleYOperation::toMatrix() const {
  return TransformMatrix::ScaleY(value.value);
}

// Translate
TranslateOperation::TranslateOperation(const double value)
    : TransformOperationBase<CSSDimension>(CSSDimension(value)) {}
TranslateOperation::TranslateOperation(const std::string &value)
    : TransformOperationBase<CSSDimension>(CSSDimension(value)) {}
bool TranslateOperation::isRelative() const {
  return value.isRelative;
}
folly::dynamic TranslateOperation::valueToDynamic() const {
  return value.toDynamic();
}
TransformMatrix TranslateOperation::toMatrix() const {
  return toMatrix(value.value);
}

TransformOperationType TranslateXOperation::type() const {
  return TransformOperationType::TranslateX;
}
TransformMatrix TranslateXOperation::toMatrix(double resolvedValue) const {
  if (value.isRelative) {
    throw std::invalid_argument(
        "[Reanimated] Cannot convert relative translateX to the matrix.");
  }
  return TransformMatrix::TranslateX(resolvedValue);
}

TransformOperationType TranslateYOperation::type() const {
  return TransformOperationType::TranslateY;
}
TransformMatrix TranslateYOperation::toMatrix(double resolvedValue) const {
  if (value.isRelative) {
    throw std::invalid_argument(
        "[Reanimated] Cannot convert relative translateY to the matrix.");
  }
  return TransformMatrix::TranslateY(resolvedValue);
}

// Skew
SkewOperation::SkewOperation(const std::string &value)
    : TransformOperationBase<CSSAngle>(CSSAngle(value)) {}
folly::dynamic SkewOperation::valueToDynamic() const {
  return value.toDynamic();
}

TransformOperationType SkewXOperation::type() const {
  return TransformOperationType::SkewX;
}
TransformMatrix SkewXOperation::toMatrix() const {
  return TransformMatrix::SkewX(value.value);
}

TransformOperationType SkewYOperation::type() const {
  return TransformOperationType::SkewY;
}
TransformMatrix SkewYOperation::toMatrix() const {
  return TransformMatrix::SkewY(value.value);
}

// Matrix
std::variant<TransformMatrix, TransformOperations> simplifyOperations(
    const TransformOperations &operations) {
  // Initialize the stack with the reversed list of operations
  std::vector<std::shared_ptr<TransformOperation>> operationsStack(
      operations.begin(), operations.end());
  TransformOperations reversedOperations;
  TransformMatrix simplifiedMatrix = TransformMatrix::Identity();
  bool hasSimplifications = false;

  while (!operationsStack.empty()) {
    auto operation = operationsStack.back();
    operationsStack.pop_back();

    if (operation->type() == TransformOperationType::Matrix) {
      const auto matrixOperation =
          std::static_pointer_cast<MatrixOperation>(operation);
      if (std::holds_alternative<TransformOperations>(matrixOperation->value)) {
        // If the current operation is a matrix created from other operations,
        // add all of these operations to the stack
        for (auto &op : std::get<TransformOperations>(matrixOperation->value)) {
          operationsStack.push_back(op);
        }
        continue;
      }
    }

    if (!operation->isRelative()) {
      // If the operation is not relative, it can be simplified (converted to
      // the matrix and multiplied)
      const auto operationMatrix = operation->toMatrix();
      simplifiedMatrix = hasSimplifications
          ? (simplifiedMatrix * operationMatrix)
          : operationMatrix;
      hasSimplifications = true;
    } else {
      // If the current operation is relative, we need to add the current
      // simplified matrix to the list of operations before adding the
      // relative operation
      if (hasSimplifications) {
        reversedOperations.emplace_back(
            std::make_shared<MatrixOperation>(simplifiedMatrix));
        simplifiedMatrix = TransformMatrix::Identity();
        hasSimplifications = false;
      }
      reversedOperations.emplace_back(operation);
    }
  }

  if (hasSimplifications) {
    // We can return just a single matrix if there are no operations or the
    // only operation is a simplified matrix (when hasSimplifications is true)
    if (reversedOperations.size() <= 1) {
      return simplifiedMatrix;
    }
    // Otherwise, add the last simplified matrix to the list of operations
    reversedOperations.emplace_back(
        std::make_shared<MatrixOperation>(simplifiedMatrix));
  }

  // Reverse the list of operations to maintain the order
  std::reverse(reversedOperations.begin(), reversedOperations.end());
  return reversedOperations;
}

MatrixOperation::MatrixOperation(const TransformMatrix &value)
    : TransformOperationBase<
          std::variant<TransformMatrix, TransformOperations>>(value) {}
MatrixOperation::MatrixOperation(const TransformOperations &operations)
    // Simplify operations to reduce the number of matrix multiplications
    // during matrix keyframe interpolation
    : TransformOperationBase<
          std::variant<TransformMatrix, TransformOperations>>(
          simplifyOperations(operations)) {}
TransformOperationType MatrixOperation::type() const {
  return TransformOperationType::Matrix;
}
bool MatrixOperation::operator==(const TransformOperation &other) const {
  if (type() != other.type()) {
    return false;
  }

  const auto *otherOperation = dynamic_cast<const MatrixOperation *>(&other);
  if (otherOperation == nullptr) {
    return false;
  }

  const auto hasOperations = std::holds_alternative<TransformOperations>(value);
  const auto otherHasOperations =
      std::holds_alternative<TransformOperations>(otherOperation->value);

  if (hasOperations != otherHasOperations) {
    return false;
  }
  if (!hasOperations) {
    return std::get<TransformMatrix>(value) ==
        std::get<TransformMatrix>(otherOperation->value);
  }

  const auto &operations = std::get<TransformOperations>(value);
  const auto &otherOperations =
      std::get<TransformOperations>(otherOperation->value);

  if (operations.size() != otherOperations.size()) {
    return false;
  }
  for (size_t i = 0; i < operations.size(); ++i) {
    if (*operations[i] != *otherOperations[i]) {
      return false;
    }
  }
  return true;
}

folly::dynamic MatrixOperation::valueToDynamic() const {
  if (!std::holds_alternative<TransformMatrix>(value)) {
    throw std::invalid_argument(
        "[Reanimated] Cannot convert unprocessed transform operations to the dynamic value.");
  }
  return std::get<TransformMatrix>(value).toDynamic();
}

TransformMatrix MatrixOperation::toMatrix() const {
  if (!std::holds_alternative<TransformMatrix>(value)) {
    throw std::invalid_argument(
        "[Reanimated] Cannot convert unprocessed transform operations to the matrix.");
  }
  return std::get<TransformMatrix>(value);
}

template struct TransformOperationBase<CSSDouble>;
template struct TransformOperationBase<CSSAngle>;
template struct TransformOperationBase<CSSDimension>;
template struct TransformOperationBase<
    std::variant<TransformMatrix, TransformOperations>>;

} // namespace reanimated::css
