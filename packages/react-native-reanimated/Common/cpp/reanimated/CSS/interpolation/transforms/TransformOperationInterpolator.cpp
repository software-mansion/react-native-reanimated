#include <reanimated/CSS/interpolation/transforms/TransformOperationInterpolator.h>

namespace reanimated::css {

std::shared_ptr<TransformOperation> TransformInterpolator::resolveOperation(
    const std::shared_ptr<TransformOperation> &operation,
    const UpdateContext &context) const {
  return operation;
}

folly::dynamic
TransformOperationInterpolator<PerspectiveOperation>::interpolate(
    double progress,
    const std::shared_ptr<TransformOperation> &from,
    const std::shared_ptr<TransformOperation> &to,
    const TransformInterpolationContext &context) const {
  const auto &fromValue =
      std::static_pointer_cast<PerspectiveOperation>(from)->value;
  const auto &toValue =
      std::static_pointer_cast<PerspectiveOperation>(to)->value;

  if (fromValue.value == 0)
    return from->toDynamic();
  if (toValue.value == 0)
    return to->toDynamic();

  return PerspectiveOperation(fromValue.interpolate(progress, toValue))
      .toDynamic();
}

folly::dynamic TransformOperationInterpolator<MatrixOperation>::interpolate(
    double progress,
    const std::shared_ptr<TransformOperation> &from,
    const std::shared_ptr<TransformOperation> &to,
    const TransformInterpolationContext &context) const {
  const auto fromMatrix = matrixFromOperation(
      *std::static_pointer_cast<MatrixOperation>(from), context);
  const auto toMatrix = matrixFromOperation(
      *std::static_pointer_cast<MatrixOperation>(to), context);
  const auto decomposedFrom = fromMatrix.decompose();
  const auto decomposedTo = toMatrix.decompose();

  if (!decomposedFrom.has_value() || !decomposedTo.has_value()) {
    return MatrixOperation(progress < 0.5 ? fromMatrix : toMatrix).toDynamic();
  }

  return MatrixOperation(
             TransformMatrix3D::recompose(
                 decomposedFrom->interpolate(progress, decomposedTo.value())))
      .toDynamic();
}

TransformMatrix3D
TransformOperationInterpolator<MatrixOperation>::matrixFromOperation(
    const MatrixOperation &matrixOperation,
    const TransformInterpolationContext &context) const {
  if (std::holds_alternative<TransformOperations>(matrixOperation.value)) {
    const auto &operations =
        std::get<TransformOperations>(matrixOperation.value);

    TransformMatrix3D matrix = TransformMatrix3D::Identity();

    for (int i = static_cast<int>(operations.size()) - 1; i >= 0; i--) {
      auto operation = operations[i];

      if (operation->isRelative()) {
        const auto &interpolator = context.interpolators->at(operation->type());
        operation = interpolator->resolveOperation(operation, context);
      }

      matrix *= operation->toMatrix();
    }

    return matrix;
  }

  return std::get<TransformMatrix3D>(matrixOperation.value);
}

} // namespace reanimated::css
