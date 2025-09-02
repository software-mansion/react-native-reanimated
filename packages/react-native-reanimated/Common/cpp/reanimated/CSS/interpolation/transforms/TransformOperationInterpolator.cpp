#include <reanimated/CSS/interpolation/transforms/TransformOperationInterpolator.h>

namespace reanimated::css {

PerspectiveOperation
TransformOperationInterpolator<PerspectiveOperation>::interpolate(
    double progress,
    const PerspectiveOperation &from,
    const PerspectiveOperation &to,
    const TransformInterpolationContext &context) const {
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
    const TransformInterpolationContext &context) const {
  const auto is3D = from.is3D() || to.is3D();
  const auto fromMatrix = from.toMatrix(is3D, context);
  const auto toMatrix = to.toMatrix(is3D, context);
  const auto decomposedFrom = fromMatrix->decompose();
  const auto decomposedTo = toMatrix->decompose();

  if (!decomposedFrom.has_value() || !decomposedTo.has_value()) {
    return MatrixOperation(progress < 0.5 ? fromMatrix : toMatrix);
  }

  return MatrixOperation(TransformMatrix3D::recompose(
      decomposedFrom->interpolate(progress, decomposedTo.value())));
}

} // namespace reanimated::css
