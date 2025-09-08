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
  const auto fromMatrix = std::static_pointer_cast<const TransformMatrix3D>(
      matrixFromOperation(from, true, context));
  const auto toMatrix = std::static_pointer_cast<const TransformMatrix3D>(
      matrixFromOperation(to, true, context));
  const auto decomposedFrom = fromMatrix->decompose();
  const auto decomposedTo = toMatrix->decompose();

  if (!decomposedFrom.has_value() || !decomposedTo.has_value()) {
    return folly::dynamic::object(
        from->getOperationName(),
        (progress < 0.5 ? fromMatrix : toMatrix)->toDynamic());
  }

  return MatrixOperation(
             TransformMatrix3D::recompose(
                 decomposedFrom->interpolate(progress, decomposedTo.value())))
      .toDynamic();
}

TransformMatrix::Shared
TransformOperationInterpolator<MatrixOperation>::matrixFromOperation(
    const std::shared_ptr<TransformOperation> &operation,
    const bool shouldBe3D,
    const TransformInterpolationContext &context) const {
  const auto &matrixOp = std::static_pointer_cast<MatrixOperation>(operation);

  if (std::holds_alternative<TransformMatrix::Shared>(matrixOp->value)) {
    return std::get<TransformMatrix::Shared>(matrixOp->value);
  }

  const auto &operations = std::get<TransformOperations>(matrixOp->value);

  // Map over operations and resolve unresolved ones
  TransformOperations resolvedOperations;
  resolvedOperations.reserve(operations.size());

  std::transform(
      operations.begin(),
      operations.end(),
      std::back_inserter(resolvedOperations),
      [&](const auto &op) -> std::shared_ptr<TransformOperation> {
        if (op->shouldResolve()) {
          const auto &interpolator = context.interpolators->at(op->type);
          return interpolator->resolveOperation(op, context);
        } else {
          return op;
        }
      });

  return std::make_shared<TransformMatrix3D>(
      matrixFromOperations3D(resolvedOperations));
}

} // namespace reanimated::css
