#include <reanimated/CSS/interpolation/transforms/operations/matrix.h>

namespace reanimated::css {

TransformMatrix2D operationsToMatrix2D(const TransformOperations &operations) {
  auto result = TransformMatrix2D();

  for (const auto &operation : operations) {
    auto matrix = operation->toMatrix(MATRIX_2D_DIMENSION);
    result *= static_cast<TransformMatrix2D &>(*matrix);
  }

  return result;
}

TransformMatrix3D operationsToMatrix3D(const TransformOperations &operations) {
  auto result = TransformMatrix3D();

  for (const auto &operation : operations) {
    auto matrix = operation->toMatrix(MATRIX_3D_DIMENSION);
    result *= static_cast<TransformMatrix3D &>(*matrix);
  }

  return result;
}

std::pair<TransformOperations, bool> flattenAndReverseOperations(
    const TransformOperations &operations) {
  std::deque<std::shared_ptr<TransformOperation>> unprocessedStack(
      operations.begin(), operations.end());
  TransformOperations result;
  // Can grow beyond this size but it's still better to reserve at least the
  // minimum space we know that we need
  result.reserve(operations.size());
  bool is3D = false;

  while (!unprocessedStack.empty()) {
    const auto operation = unprocessedStack.back();
    unprocessedStack.pop_back();

    if (operation->type() == TransformOp::Matrix) {
      const auto matrixOperation =
          std::static_pointer_cast<MatrixOperation>(operation);
      if (std::holds_alternative<TransformOperations>(matrixOperation->value)) {
        // If the current operation is a matrix created from other operations,
        // add all of these operations to the stack
        std::ranges::copy(
            std::get<TransformOperations>(matrixOperation->value),
            std::back_inserter(unprocessedStack));
        continue;
      }
    }

    if (operation->is3D()) {
      is3D = true;
    }

    result.emplace_back(operation);
  }

  return {std::move(result), is3D};
}

/**
 * Simplifies the vector of operations by converting to matrices and multiplying
 * transformations that can be converted. This reduces the number of operations
 * in the resulting operations vector.
 */
TransformOperations simplifyOperations(const TransformOperations &operations) {
  const auto [reversedOperations, is3D] =
      flattenAndReverseOperations(operations);

  TransformOperations result;
  TransformOperations toSimplify;

  auto addMatrixOperation = [&]() {
    if (is3D) {
      result.emplace_back(
          std::make_shared<MatrixOperation>(operationsToMatrix3D(toSimplify)));
    } else {
      result.emplace_back(
          std::make_shared<MatrixOperation>(operationsToMatrix2D(toSimplify)));
    }
    toSimplify.clear();
  };

  for (const auto &operation : reversedOperations) {
    if (!operation->isRelative()) {
      toSimplify.emplace_back(operation);
      continue;
    }

    if (!toSimplify.empty()) {
      addMatrixOperation();
    }

    result.emplace_back(operation);
  }

  if (!toSimplify.empty()) {
    addMatrixOperation();
  }

  // Reverse back to the original order of operations as we were processing
  // them in the reverse order
  std::reverse(result.begin(), result.end());
  return result;
}

MatrixOperation::MatrixOperation(TransformMatrix2D matrix)
    : TransformOperationBase<
          TransformOp::Matrix,
          std::variant<std::unique_ptr<TransformMatrix>, TransformOperations>>(
          std::make_unique<TransformMatrix2D>(std::move(matrix))),
      is3D_(false) {}

MatrixOperation::MatrixOperation(TransformMatrix3D matrix)
    : TransformOperationBase<
          TransformOp::Matrix,
          std::variant<std::unique_ptr<TransformMatrix>, TransformOperations>>(
          std::make_unique<TransformMatrix3D>(std::move(matrix))),
      is3D_(true) {}

MatrixOperation::MatrixOperation(TransformOperations operations)
    // Simplify operations to reduce the number of matrix multiplications
    // during matrix keyframe interpolation
    : TransformOperationBase<
          TransformOp::Matrix,
          std::variant<std::unique_ptr<TransformMatrix>, TransformOperations>>(
          simplifyOperations(std::move(operations))) {
  for (const auto &operation : std::get<TransformOperations>(value)) {
    if (operation->is3D()) {
      is3D_ = true;
      break;
    }
  }
}

bool MatrixOperation::operator==(const TransformOperation &other) const {
  if (type() != other.type()) {
    return false;
  }

  const auto *otherOperation = dynamic_cast<const MatrixOperation *>(&other);
  if (otherOperation == nullptr) {
    return false;
  }

  // Quick check: if variants have different types, they're not equal
  if (value.index() != otherOperation->value.index()) {
    return false;
  }

  // Both hold TransformOperations
  if (std::holds_alternative<TransformOperations>(value)) {
    return std::get<TransformOperations>(value) ==
        std::get<TransformOperations>(otherOperation->value);
  }

  // Both hold matrices
  return *std::get<std::unique_ptr<TransformMatrix>>(value) ==
      *std::get<std::unique_ptr<TransformMatrix>>(otherOperation->value);
}

folly::dynamic MatrixOperation::valueToDynamic() const {
  if (!std::holds_alternative<std::unique_ptr<TransformMatrix>>(value)) {
    throw std::invalid_argument(
        "[Reanimated] Cannot convert unprocessed transform operations to the dynamic value.");
  }
  return std::get<std::unique_ptr<TransformMatrix>>(value)->toDynamic();
}

bool MatrixOperation::is3D() const {
  return is3D_;
}

std::unique_ptr<TransformMatrix> MatrixOperation::toMatrix(bool force3D) const {
  if (!std::holds_alternative<std::unique_ptr<TransformMatrix>>(value)) {
    throw std::invalid_argument(
        "[Reanimated] Cannot convert unprocessed transform operations to the matrix.");
  }
  return matrixFromVariant(force3D);
}

std::unique_ptr<TransformMatrix> MatrixOperation::toMatrix(
    bool force3D,
    const TransformUpdateContext &context) const {
  if (std::holds_alternative<std::unique_ptr<TransformMatrix>>(value)) {
    return matrixFromVariant(force3D);
  }

  const auto &operations = std::get<TransformOperations>(value);

  std::vector<std::unique_ptr<TransformMatrix>> matrices;
  matrices.reserve(operations.size());

  for (const auto &op : operations) {
    matrices.push_back(op->toMatrix(force3D, context));
  }

  if (is3D_ || force3D) {
    return std::make_unique<TransformMatrix3D>(operationsToMatrix3D(matrices));
  }
  return std::make_unique<TransformMatrix2D>(operationsToMatrix2D(matrices));
}

std::unique_ptr<TransformMatrix> MatrixOperation::matrixFromVariant(
    bool force3D) const {
  const auto &storedMatrix = std::get<std::unique_ptr<TransformMatrix>>(value);

  if (storedMatrix->getDimension() == MATRIX_3D_DIMENSION) {
    // If 3D matrix is stored
    return std::make_unique<TransformMatrix3D>(*storedMatrix);
  }

  if (force3D) {
    // If 2D matrix is stored and we want a 3D matrix
    return std::make_unique<TransformMatrix3D>(TransformMatrix3D::from2D(
        static_cast<const TransformMatrix2D &>(*storedMatrix)));
  }
  // If 2D matrix is stored and we don't want a 3D matrix
  return std::make_unique<TransformMatrix2D>(*storedMatrix);
}

} // namespace reanimated::css
