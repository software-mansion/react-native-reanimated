#include <reanimated/CSS/interpolation/transforms/operations/matrix.h>

namespace reanimated::css {

// Matrix
std::variant<TransformMatrix3D, TransformOperations> simplifyOperations(
    const TransformOperations &operations) {
  // Initialize the stack with the reversed list of operations
  std::vector<std::shared_ptr<TransformOperation>> operationsStack(
      operations.begin(), operations.end());
  TransformOperations reversedOperations;
  TransformMatrix3D simplifiedMatrix = TransformMatrix3D::Identity();
  bool hasSimplifications = false;

  while (!operationsStack.empty()) {
    auto operation = operationsStack.back();
    operationsStack.pop_back();

    if (operation->type() == TransformOp::Matrix) {
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
        simplifiedMatrix = TransformMatrix3D::Identity();
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

MatrixOperation::MatrixOperation(const TransformMatrix3D &value)
    : TransformOperationBase<
          TransformOp::Matrix,
          std::variant<TransformMatrix3D, TransformOperations>>(value) {}

MatrixOperation::MatrixOperation(const TransformOperations &operations)
    // Simplify operations to reduce the number of matrix multiplications
    // during matrix keyframe interpolation
    : TransformOperationBase<
          TransformOp::Matrix,
          std::variant<TransformMatrix3D, TransformOperations>>(
          simplifyOperations(operations)) {}

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
    return std::get<TransformMatrix3D>(value) ==
        std::get<TransformMatrix3D>(otherOperation->value);
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
  if (!std::holds_alternative<TransformMatrix3D>(value)) {
    throw std::invalid_argument(
        "[Reanimated] Cannot convert unprocessed transform operations to the dynamic value.");
  }
  return std::get<TransformMatrix3D>(value).toDynamic();
}

TransformMatrix3D MatrixOperation::toMatrix() const {
  if (!std::holds_alternative<TransformMatrix3D>(value)) {
    throw std::invalid_argument(
        "[Reanimated] Cannot convert unprocessed transform operations to the matrix.");
  }
  return std::get<TransformMatrix3D>(value);
}

} // namespace reanimated::css
