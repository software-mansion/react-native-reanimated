#include <reanimated/CSS/interpolation/transforms/TransformOperationInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/operations/matrix.h>

#include <algorithm>

namespace reanimated::css {

TransformMatrix3D matrixFromOperations3D(TransformOperations &operations) {
  TransformMatrix3D result;
  for (const auto &operation : operations) {
    result *=
        static_cast<const TransformMatrix3D &>(*operation->toMatrix(true));
  }
  return result;
}

TransformMatrix2D matrixFromOperations2D(TransformOperations &operations) {
  TransformMatrix2D result;
  for (const auto &operation : operations) {
    result *=
        static_cast<const TransformMatrix2D &>(*operation->toMatrix(false));
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

    if (operation->type == TransformOp::Matrix) {
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

  auto maybeAddMatrixOperation = [&]() {
    if (!toSimplify.empty()) {
      if (is3D) {
        result.emplace_back(std::make_shared<MatrixOperation>(
            matrixFromOperations3D(toSimplify)));
      } else {
        result.emplace_back(std::make_shared<MatrixOperation>(
            matrixFromOperations2D(toSimplify)));
      }
      toSimplify.clear();
    }
  };

  for (const auto &operation : reversedOperations) {
    if (operation->isRelative()) {
      maybeAddMatrixOperation();
      result.emplace_back(operation);
    } else {
      toSimplify.emplace_back(operation);
    }
  }

  maybeAddMatrixOperation();

  // Reverse back to the original order of operations as we were processing
  // them in the reverse order
  std::reverse(result.begin(), result.end());
  return result;
}

namespace {
constexpr const char *UNPROCESSED_OPERATIONS_ERROR =
    "[Reanimated] Cannot convert unprocessed transform operations to matrix without the TransformInterpolationContext";
}

MatrixOperation::MatrixOperation(jsi::Runtime &rt, const jsi::Value &value)
    : MatrixOperation([&]() -> TransformMatrix::Shared {
        // Try 2D first, then 3D (will throw if neither works)
        if (TransformMatrix2D::canConstruct(rt, value)) {
          is3D_ = false;
          return std::make_shared<const TransformMatrix2D>(rt, value);
        }
        is3D_ = true;
        return std::make_shared<const TransformMatrix3D>(rt, value);
      }()) {}

MatrixOperation::MatrixOperation(const folly::dynamic &value)
    : MatrixOperation([&]() -> TransformMatrix::Shared {
        // Try 2D first, then 3D (will throw if neither works)
        if (TransformMatrix2D::canConstruct(value)) {
          is3D_ = false;
          return std::make_shared<const TransformMatrix2D>(value);
        }
        is3D_ = true;
        return std::make_shared<const TransformMatrix3D>(value);
      }()) {}

MatrixOperation::MatrixOperation(TransformMatrix2D matrix)
    : TransformOperation(TransformOp::Matrix),
      value(std::make_shared<const TransformMatrix2D>(std::move(matrix))),
      is3D_(false) {}

MatrixOperation::MatrixOperation(TransformMatrix3D matrix)
    : TransformOperation(TransformOp::Matrix),
      value(std::make_shared<const TransformMatrix3D>(std::move(matrix))),
      is3D_(true) {}

MatrixOperation::MatrixOperation(TransformOperations operations)
    // Simplify operations to reduce the number of matrix
    // multiplications during matrix keyframe interpolation
    : TransformOperation(TransformOp::Matrix),
      value(simplifyOperations(std::move(operations))) {
  const auto &ops = std::get<TransformOperations>(value);
  is3D_ = std::any_of(
      ops.begin(), ops.end(), [](const auto &op) { return op->is3D(); });
}

bool MatrixOperation::operator==(const TransformOperation &other) const {
  if (type != other.type) {
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
  return *std::get<TransformMatrix::Shared>(value) ==
      *std::get<TransformMatrix::Shared>(otherOperation->value);
}

TransformMatrix::Shared MatrixOperation::toMatrix(const bool force3D) const {
  if (auto storedMatrix = getStoredMatrix(force3D)) {
    return storedMatrix;
  }

  throw std::runtime_error(UNPROCESSED_OPERATIONS_ERROR);
}

folly::dynamic MatrixOperation::valueToDynamic() const {
  if (!std::holds_alternative<TransformMatrix::Shared>(value)) {
    throw std::invalid_argument(
        "[Reanimated] Cannot convert unprocessed transform operations to the matrix.");
  }
  return std::get<TransformMatrix::Shared>(value)->toDynamic();
}

TransformMatrix::Shared MatrixOperation::getStoredMatrix(bool force3D) const {
  if (std::holds_alternative<TransformMatrix::Shared>(value)) {
    const auto &storedMatrix = std::get<TransformMatrix::Shared>(value);

    if (force3D && storedMatrix->getDimension() == MATRIX_2D_DIMENSION) {
      return std::make_shared<const TransformMatrix3D>(
          TransformMatrix3D::from2D(
              static_cast<const TransformMatrix2D &>(*storedMatrix)));
    }

    return storedMatrix;
  }
  return nullptr;
}

} // namespace reanimated::css
