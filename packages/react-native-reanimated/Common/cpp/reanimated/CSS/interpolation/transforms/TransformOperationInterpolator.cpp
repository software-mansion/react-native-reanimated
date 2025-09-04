#include <reanimated/CSS/interpolation/transforms/TransformOperationInterpolator.h>

namespace reanimated::css {

std::shared_ptr<TransformOperation>
TransformOperationInterpolator<PerspectiveOperation>::interpolate(
    double progress,
    const std::shared_ptr<TransformOperation> &from,
    const std::shared_ptr<TransformOperation> &to,
    const TransformInterpolationContext &context) const {
  const auto &fromOp = *std::static_pointer_cast<PerspectiveOperation>(from);
  const auto &toOp = *std::static_pointer_cast<PerspectiveOperation>(to);

  if (toOp.value.value == 0)
    return std::make_shared<PerspectiveOperation>(0);
  if (fromOp.value.value == 0)
    return std::make_shared<PerspectiveOperation>(toOp.value);

  return std::make_shared<PerspectiveOperation>(
      fromOp.value.interpolate(progress, toOp.value));
}

std::shared_ptr<TransformOperation>
TransformOperationInterpolator<MatrixOperation>::interpolate(
    double progress,
    const std::shared_ptr<TransformOperation> &from,
    const std::shared_ptr<TransformOperation> &to,
    const TransformInterpolationContext &context) const {
  const auto is3D = from->is3D() || to->is3D();
  const auto fromMatrix = from->toMatrix(is3D, context);
  const auto toMatrix = to->toMatrix(is3D, context);
  const auto decomposedFrom = fromMatrix->decompose();
  const auto decomposedTo = toMatrix->decompose();

  if (!decomposedFrom.has_value() || !decomposedTo.has_value()) {
    return progress < 0.5 ? from : to;
  }

  return std::make_shared<MatrixOperation>(TransformMatrix3D::recompose(
      decomposedFrom->interpolate(progress, decomposedTo.value())));
}

std::shared_ptr<TransformMatrix>
TransformOperationInterpolator<MatrixOperation>::resolveMatrix(
    const std::shared_ptr<MatrixOperation> &operation,
    const TransformInterpolationContext &context,
    const bool force3D) const {
  if (std::holds_alternative<TransformMatrix::Shared>(operation->value)) {
    return operation->matrixFromVariant(force3D);
  }

  std::vector<TransformMatrix::Shared> matrices;
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
    return std::make_shared<const TransformMatrix3D>(result);
  }

  auto result = TransformMatrix2D();
  for (const auto &matrix : matrices) {
    result *= static_cast<const TransformMatrix2D &>(*matrix);
  }
  return std::make_shared<const TransformMatrix2D>(result);
}

} // namespace reanimated::css
