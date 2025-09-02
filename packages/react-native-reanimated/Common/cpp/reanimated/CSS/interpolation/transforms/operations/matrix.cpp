#include <reanimated/CSS/interpolation/transforms/operations/matrix.h>

namespace reanimated::css {

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
        const auto &nestedOps =
            std::get<TransformOperations>(matrixOperation->value);
        unprocessedStack.insert(
            unprocessedStack.end(), nestedOps.begin(), nestedOps.end());
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
  result.reserve(operations.size());
  toSimplify.reserve(operations.size());

  auto addMatrixOperation = [&]() {
    if (is3D) {
      auto result = TransformMatrix3D();
      for (const auto &operation : toSimplify) {
        auto matrix = operation->toMatrix(true);
        result *= static_cast<const TransformMatrix3D &>(*matrix);
      }
      result.emplace_back(std::make_shared<MatrixOperation>(result));
    } else {
      auto result = TransformMatrix2D();
      for (const auto &operation : toSimplify) {
        auto matrix = operation->toMatrix(false);
        result *= static_cast<const TransformMatrix2D &>(*matrix);
      }
      result.emplace_back(std::make_shared<MatrixOperation>(result));
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

MatrixOperation::MatrixOperation(jsi::Runtime &rt, const jsi::Value &value)
    : TransformOperationBase<
          TransformOp::Matrix,
          std::variant<std::unique_ptr<TransformMatrix>, TransformOperations>>(
          [&]() -> std::unique_ptr<TransformMatrix> {
            // Try 2D first, then 3D (will throw if neither works)
            if (TransformMatrix2D::canConstruct(rt, value)) {
              is3D_ = false;
              return std::make_unique<TransformMatrix2D>(rt, value);
            }
            is3D_ = true;
            return std::make_unique<TransformMatrix3D>(rt, value);
          }()) {}

MatrixOperation::MatrixOperation(const folly::dynamic &value)
    : TransformOperationBase<
          TransformOp::Matrix,
          std::variant<std::unique_ptr<TransformMatrix>, TransformOperations>>(
          [&]() -> std::unique_ptr<TransformMatrix> {
            // Try 2D first, then 3D (will throw if neither works)
            if (TransformMatrix2D::canConstruct(value)) {
              is3D_ = false;
              return std::make_unique<TransformMatrix2D>(value);
            }
            is3D_ = true;
            return std::make_unique<TransformMatrix3D>(value);
          }()) {}

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
  const auto &ops = std::get<TransformOperations>(value);
  is3D_ = std::any_of(
      ops.begin(), ops.end(), [](const auto &op) { return op->is3D(); });
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

std::unique_ptr<TransformMatrix> MatrixOperation::toMatrix(bool force3D) const {
  if (!std::holds_alternative<std::unique_ptr<TransformMatrix>>(value)) {
    throw std::invalid_argument(
        "[Reanimated] Cannot convert unprocessed transform operations to the matrix.");
  }
  return matrixFromVariant(force3D);
}

std::unique_ptr<TransformMatrix> MatrixOperation::toMatrix(
    bool force3D,
    const TransformInterpolationContext &context) const {
  if (std::holds_alternative<std::unique_ptr<TransformMatrix>>(value)) {
    return matrixFromVariant(force3D);
  }

  const auto &operations = std::get<TransformOperations>(value);

  std::vector<std::unique_ptr<TransformMatrix>> matrices;
  matrices.reserve(operations.size());

  const auto is3D = is3D_ || force3D;
  for (const auto &op : operations) {
    matrices.emplace_back(op->toMatrix(is3D, context));
  }

  if (is3D) {
    auto result = TransformMatrix3D();
    for (const auto &matrix : matrices) {
      result *= static_cast<const TransformMatrix3D &>(*matrix);
    }
    return std::make_unique<TransformMatrix>(result);
  }

  auto result = TransformMatrix2D();
  for (const auto &matrix : matrices) {
    result *= static_cast<const TransformMatrix2D &>(*matrix);
  }
  return std::make_unique<TransformMatrix>(result);
}

std::unique_ptr<TransformMatrix> MatrixOperation::matrixFromVariant(
    bool force3D) const {
  const auto &storedMatrix = std::get<std::unique_ptr<TransformMatrix>>(value);

  // Use the cached is3D_ flag instead of checking dimension at runtime
  if (is3D_) {
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
