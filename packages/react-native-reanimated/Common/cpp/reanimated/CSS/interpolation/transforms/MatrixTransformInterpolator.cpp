#ifdef RCT_NEW_ARCH_ENABLED
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
  const auto decomposedFrom = fromMatrix.decompose();
  const auto decomposedTo = toMatrix.decompose();

  if (!decomposedFrom.has_value() || !decomposedTo.has_value()) {
    return MatrixOperation(progress < 0.5 ? fromMatrix : toMatrix);
  }

  return MatrixOperation(TransformMatrix::recompose(
      decomposedFrom->interpolate(progress, decomposedTo.value())));
}

TransformMatrix MatrixTransformInterpolator::matrixFromOperation(
    const MatrixOperation &matrixOperation,
    const TransformInterpolatorUpdateContext &context) {
  if (std::holds_alternative<TransformOperations>(
          matrixOperation.valueOrOperations)) {
    const auto operations =
        std::get<TransformOperations>(matrixOperation.valueOrOperations);

    TransformMatrix matrix = TransformMatrix::Identity();

    for (int i = static_cast<int>(operations.size()) - 1; i >= 0; i--) {
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

  return std::get<TransformMatrix>(matrixOperation.valueOrOperations);
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
