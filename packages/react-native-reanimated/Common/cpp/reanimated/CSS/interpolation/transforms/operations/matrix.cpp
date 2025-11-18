#include <reanimated/CSS/interpolation/transforms/TransformOperationInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/operations/matrix.h>

#include <deque>
#include <memory>
#include <utility>

namespace reanimated::css {

TransformMatrix3D matrixFromOperations3D(TransformOperations &operations) {
  TransformMatrix3D result;
  for (int i = static_cast<int>(operations.size()) - 1; i >= 0; i--) {
    result *= static_cast<const TransformMatrix3D &>(*operations[i]->toMatrix(true));
  }
  return result;
}

TransformMatrix2D matrixFromOperations2D(TransformOperations &operations) {
  TransformMatrix2D result;
  for (int i = static_cast<int>(operations.size()) - 1; i >= 0; i--) {
    result *= static_cast<const TransformMatrix2D &>(*operations[i]->toMatrix(false));
  }
  return result;
}

std::pair<TransformOperations, bool> flattenOperations(const TransformOperations &operations) {
  std::deque<std::shared_ptr<TransformOperation>> unprocessedQueue(operations.begin(), operations.end());
  TransformOperations result;
  bool is3D = false;

  while (!unprocessedQueue.empty()) {
    const auto operation = unprocessedQueue.front();
    unprocessedQueue.pop_front();

    if (operation->type == static_cast<uint8_t>(TransformOp::Matrix)) {
      const auto matrixOperation = std::static_pointer_cast<MatrixOperation>(operation);
      if (std::holds_alternative<TransformOperations>(matrixOperation->value)) {
        // If the current operation is a matrix created from other operations,
        // add all of these operations at the beginning of the queue
        const auto &nestedOps = std::get<TransformOperations>(matrixOperation->value);
        unprocessedQueue.insert(unprocessedQueue.begin(), nestedOps.begin(), nestedOps.end());
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
 * in the resulting operations vector or returns a single matrix if all
 * operations can be converted to a matrix.
 */
std::pair<MatrixOperationValue, bool> simplifyOperations(const TransformOperations &operations) {
  const auto [flattenedOperations, is3D] = flattenOperations(operations);

  TransformOperations result;
  TransformOperations toSimplify;
  result.reserve(operations.size());
  toSimplify.reserve(operations.size());

  const auto simplify = [&]() {
    return is3D ? std::make_shared<MatrixOperation>(matrixFromOperations3D(toSimplify))
                : std::make_shared<MatrixOperation>(matrixFromOperations2D(toSimplify));
  };

  for (const auto &operation : flattenedOperations) {
    if (operation->shouldResolve()) {
      if (toSimplify.size() > 0) {
        result.emplace_back(simplify());
        toSimplify.clear();
      }

      // Keep operations that need to be resolved unchanged in the transform
      // operations vector
      result.emplace_back(operation);
    } else {
      toSimplify.emplace_back(operation);
    }
  }

  // Result is empty only if there was not a single operation that needed to be
  // resolved (all operations were added to the toSimplify vector)
  if (result.empty()) {
    return {simplify()->toMatrix(is3D), is3D};
  }

  result.emplace_back(simplify());

  return {std::move(result), is3D};
}

MatrixOperation::MatrixOperation(MatrixOperationValue value)
    : TransformOperation(TransformOp::Matrix), value(std::move(value)) {
  // Initialize is3D_ based on the variant content
  if (std::holds_alternative<TransformMatrix::Shared>(this->value)) {
    const auto &matrix = std::get<TransformMatrix::Shared>(this->value);
    is3D_ = matrix->getDimension() == MATRIX_3D_DIMENSION;
  } else {
    // If it contains TransformOperations, check if any operation is 3D
    const auto &operations = std::get<TransformOperations>(this->value);
    is3D_ = false;
    for (const auto &operation : operations) {
      if (operation->is3D()) {
        is3D_ = true;
        break;
      }
    }
  }
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
    : TransformOperation(TransformOp::Matrix), value([&]() {
        const auto &[value, is3D] = simplifyOperations(operations);
        is3D_ = is3D;
        return value;
      }()) {}

bool MatrixOperation::is3D() const {
  return is3D_;
}

folly::dynamic MatrixOperation::valueToDynamic() const {
  return getMatrixFromVariant()->toDynamic();
}

TransformMatrix::Shared MatrixOperation::toMatrix(const bool force3D) const {
  const auto &storedMatrix = getMatrixFromVariant();

  if (force3D && storedMatrix->getDimension() == MATRIX_2D_DIMENSION) {
    return std::make_shared<const TransformMatrix3D>(
        TransformMatrix3D::from2D(static_cast<const TransformMatrix2D &>(*storedMatrix)));
  }

  return storedMatrix;
}

const TransformMatrix::Shared &MatrixOperation::getMatrixFromVariant() const {
  if (!std::holds_alternative<TransformMatrix::Shared>(value)) {
    throw std::runtime_error("[Reanimated] Cannot convert unprocessed transform operations to the matrix.");
  }
  return std::get<TransformMatrix::Shared>(value);
}

bool MatrixOperation::areValuesEqual(const StyleOperation &other) const {
  const auto &otherOperation = static_cast<const MatrixOperation &>(other);

  // Quick check: if variants have different types, they're not equal
  if (value.index() != otherOperation.value.index()) {
    return false;
  }

  // Both hold TransformOperations
  if (std::holds_alternative<TransformOperations>(value)) {
    return std::get<TransformOperations>(value) == std::get<TransformOperations>(otherOperation.value);
  }

  // Both hold matrices
  return *std::get<TransformMatrix::Shared>(value) == *std::get<TransformMatrix::Shared>(otherOperation.value);
}

} // namespace reanimated::css
