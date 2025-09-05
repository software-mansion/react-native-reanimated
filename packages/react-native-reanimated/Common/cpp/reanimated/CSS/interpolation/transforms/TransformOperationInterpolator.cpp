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
  const auto shouldBe3D = from->is3D() || to->is3D();
  const auto fromOp = resolveOperation(from, shouldBe3D, context);
  const auto toOp = resolveOperation(to, shouldBe3D, context);
  const auto &fromMatrix = fromOp.toMatrix(shouldBe3D);
  const auto &toMatrix = toOp.toMatrix(shouldBe3D);

  if (shouldBe3D) {
    const auto &from3D =
        std::static_pointer_cast<const TransformMatrix3D>(fromMatrix);
    const auto &to3D =
        std::static_pointer_cast<const TransformMatrix3D>(toMatrix);

    const auto decomposedFrom = from3D->decompose();
    const auto decomposedTo = to3D->decompose();

    if (!decomposedFrom.has_value() || !decomposedTo.has_value()) {
      return progress < 0.5 ? fromOp.toDynamic() : toOp.toDynamic();
    }

    const auto recomposed = TransformMatrix3D::recompose(
        decomposedFrom->interpolate(progress, decomposedTo.value()));
    return MatrixOperation(recomposed).toDynamic();
  } else {
    const auto &from2D =
        std::static_pointer_cast<const TransformMatrix2D>(fromMatrix);
    const auto &to2D =
        std::static_pointer_cast<const TransformMatrix2D>(toMatrix);

    const auto decomposedFrom = from2D->decompose();
    const auto decomposedTo = to2D->decompose();

    if (!decomposedFrom.has_value() || !decomposedTo.has_value()) {
      return progress < 0.5 ? fromOp.toDynamic() : toOp.toDynamic();
    }

    const auto recomposed = TransformMatrix2D::recompose(
        decomposedFrom->interpolate(progress, decomposedTo.value()));
    return MatrixOperation(recomposed).toDynamic();
  }
}

MatrixOperation
TransformOperationInterpolator<MatrixOperation>::resolveOperation(
    const std::shared_ptr<TransformOperation> &operation,
    const bool shouldBe3D,
    const TransformInterpolationContext &context) const {
  const auto &matrixOp = std::static_pointer_cast<MatrixOperation>(operation);

  if (std::holds_alternative<TransformMatrix::Shared>(matrixOp->value)) {
    return *matrixOp;
  }

  const auto &operations = std::get<TransformOperations>(matrixOp->value);

  TransformOperations toMultiply;
  toMultiply.reserve(operations.size());

  for (const auto &op : operations) {
    const auto &interpolator = context.interpolators->at(op->type);
    toMultiply.emplace_back(interpolator->resolveOperation(op, context));
  }

  if (shouldBe3D) {
    return MatrixOperation(matrixFromOperations3D(toMultiply));
  }

  return MatrixOperation(matrixFromOperations2D(toMultiply));
}

} // namespace reanimated::css
