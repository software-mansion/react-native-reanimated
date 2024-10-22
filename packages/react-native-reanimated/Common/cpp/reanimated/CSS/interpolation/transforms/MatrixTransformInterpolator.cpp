#include <reanimated/CSS/interpolation/transforms/MatrixTransformInterpolator.h>

namespace reanimated {

MatrixTransformInterpolator::MatrixTransformInterpolator(
    const TransformMatrix &defaultValue)
    : TransformInterpolatorBase<MatrixOperation>(
          std::make_shared<MatrixOperation>(defaultValue)) {}

MatrixOperation MatrixTransformInterpolator::interpolate(
    const double progress,
    const MatrixOperation &fromOperation,
    const MatrixOperation &toOperation,
    const TransformInterpolatorUpdateContext &context) const {
  const auto fromMatrix = matrixFromOperation(fromOperation, context);
  const auto toMatrix = matrixFromOperation(toOperation, context);

  if (progress == 0) {
    return fromMatrix;
  }
  if (progress == 1) {
    return toMatrix;
  }

  const auto decomposedFrom = fromMatrix.decompose();
  const auto decomposedTo = toMatrix.decompose();

  if (!decomposedFrom.has_value() || !decomposedTo.has_value()) {
    return progress < 0.5 ? fromMatrix : toMatrix;
  }

  return TransformMatrix::recompose(
      decomposedFrom->interpolate(progress, decomposedTo.value()));
}

TransformMatrix MatrixTransformInterpolator::matrixFromOperation(
    const MatrixOperation &operation,
    const TransformInterpolatorUpdateContext &context) const {
  if (std::holds_alternative<TransformOperations>(
          operation.valueOrOperations)) {
    const auto operations =
        std::get<TransformOperations>(operation.valueOrOperations);

    TransformMatrix matrix = TransformMatrix::Identity();

    for (int i = operations.size() - 1; i >= 0; i--) {
      auto operation = operations[i];

      if (operation->isRelative()) {
        const auto &interpolator = context.interpolators->at(operation->type);
        operation = interpolator->resolveOperation(
            *operation, context.node, context.viewStylesRepository);
      }

      matrix *= operation->toMatrix();
    }

    return matrix;
  }

  return std::get<TransformMatrix>(operation.valueOrOperations);
}

} // namespace reanimated
