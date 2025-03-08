#include <reanimated/CSS/interpolation/transforms/TransformOperationInterpolator.h>

namespace reanimated::css {

PerspectiveOperation
TransformOperationInterpolator<PerspectiveOperation>::interpolate(
    double progress,
    const PerspectiveOperation &from,
    const PerspectiveOperation &to,
    const TransformInterpolatorUpdateContext &context) const {
  if (to.value.value == 0)
    return PerspectiveOperation(0);
  if (from.value.value == 0)
    return PerspectiveOperation(to.value);

  return PerspectiveOperation(from.value.interpolate(progress, to.value));
}

MatrixOperation TransformOperationInterpolator<MatrixOperation>::interpolate(
    double progress,
    const MatrixOperation &from,
    const MatrixOperation &to,
    const TransformInterpolatorUpdateContext &context) const {
  const auto fromMatrix = matrixFromOperation(from, context);
  const auto toMatrix = matrixFromOperation(to, context);
  const auto decomposedFrom = fromMatrix.decompose();
  const auto decomposedTo = toMatrix.decompose();

  if (!decomposedFrom.has_value() || !decomposedTo.has_value()) {
    return MatrixOperation(progress < 0.5 ? fromMatrix : toMatrix);
  }

  return MatrixOperation(TransformMatrix::recompose(
      decomposedFrom->interpolate(progress, decomposedTo.value())));
}

TransformMatrix
TransformOperationInterpolator<MatrixOperation>::matrixFromOperation(
    const MatrixOperation &matrixOperation,
    const TransformInterpolatorUpdateContext &context) const {
  if (std::holds_alternative<TransformOperations>(matrixOperation.value)) {
    const auto &operations =
        std::get<TransformOperations>(matrixOperation.value);

    TransformMatrix matrix = TransformMatrix::Identity();

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

  return std::get<TransformMatrix>(matrixOperation.value);
}

} // namespace reanimated::css
