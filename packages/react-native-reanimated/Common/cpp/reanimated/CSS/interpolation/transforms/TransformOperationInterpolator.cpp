#include <reanimated/CSS/interpolation/transforms/TransformOperationInterpolator.h>

#include <reanimated/CSS/interpolation/transforms/operations/rotate.h>
#include <reanimated/CSS/interpolation/transforms/operations/scale.h>
#include <reanimated/CSS/interpolation/transforms/operations/skew.h>
#include <reanimated/CSS/interpolation/transforms/operations/translate.h>

#include <memory>
#include <utility>

namespace reanimated::css {

std::shared_ptr<TransformOperation> TransformInterpolator::resolveOperation(
    const std::shared_ptr<TransformOperation> &operation,
    const UpdateContext &context) const {
  return operation;
}

TransformOperationInterpolator<PerspectiveOperation>::TransformOperationInterpolator(
    const std::shared_ptr<PerspectiveOperation> &defaultOperation)
    : TransformOperationInterpolatorBase<PerspectiveOperation>(defaultOperation) {}

std::unique_ptr<TransformOperation> TransformOperationInterpolator<PerspectiveOperation>::interpolate(
    double progress,
    const std::shared_ptr<TransformOperation> &from,
    const std::shared_ptr<TransformOperation> &to,
    const TransformInterpolationContext &context) const {
  const auto &fromValue = std::static_pointer_cast<PerspectiveOperation>(from)->value;
  const auto &toValue = std::static_pointer_cast<PerspectiveOperation>(to)->value;

  return std::make_unique<PerspectiveOperation>(fromValue.interpolate(progress, toValue));
}

TransformOperationInterpolator<MatrixOperation>::TransformOperationInterpolator(
    const std::shared_ptr<MatrixOperation> &defaultOperation)
    : TransformOperationInterpolatorBase<MatrixOperation>(defaultOperation) {}

std::unique_ptr<TransformOperation> TransformOperationInterpolator<MatrixOperation>::interpolate(
    double progress,
    const std::shared_ptr<TransformOperation> &from,
    const std::shared_ptr<TransformOperation> &to,
    const TransformInterpolationContext &context) const {
  const auto shouldBe3D = from->is3D() || to->is3D();

  const auto fromMatrix = matrixFromOperation(from, shouldBe3D, context);
  const auto toMatrix = matrixFromOperation(to, shouldBe3D, context);

  if (shouldBe3D) {
    return std::make_unique<MatrixOperation>(interpolateMatrix<TransformMatrix3D>(progress, fromMatrix, toMatrix));
  }

  const auto result2D = interpolateMatrix<TransformMatrix2D>(progress, fromMatrix, toMatrix);

  // Unfortunately 2D matrices aren't handled properly in RN, so we have to
  // convert them to 3D
  // see the issue: https://github.com/facebook/react-native/issues/53639
  return std::make_unique<MatrixOperation>(TransformMatrix3D::from2D(result2D));
}

template <typename MatrixType>
MatrixType TransformOperationInterpolator<MatrixOperation>::interpolateMatrix(
    double progress,
    const TransformMatrix::Shared &from,
    const TransformMatrix::Shared &to) const {
  const auto fromMatrix = std::static_pointer_cast<const MatrixType>(from);
  const auto toMatrix = std::static_pointer_cast<const MatrixType>(to);
  const auto decomposedFrom = fromMatrix->decompose();
  const auto decomposedTo = toMatrix->decompose();

  if (!decomposedFrom.has_value() || !decomposedTo.has_value()) {
    return progress < 0.5 ? *fromMatrix : *toMatrix;
  }

  return MatrixType::recompose(decomposedFrom->interpolate(progress, decomposedTo.value()));
}

TransformMatrix::Shared TransformOperationInterpolator<MatrixOperation>::matrixFromOperation(
    const std::shared_ptr<TransformOperation> &operation,
    const bool shouldBe3D,
    const TransformInterpolationContext &context) const {
  const auto &matrixOperation = std::static_pointer_cast<MatrixOperation>(operation);

  if (std::holds_alternative<TransformMatrix::Shared>(matrixOperation->value)) {
    const auto &matrix = std::get<TransformMatrix::Shared>(matrixOperation->value);

    if (shouldBe3D && !matrixOperation->is3D()) {
      return std::make_shared<TransformMatrix3D>(
          TransformMatrix3D::from2D(static_cast<const TransformMatrix2D &>(*matrix)));
    }

    return matrix;
  }

  const auto &operations = std::get<TransformOperations>(matrixOperation->value);

  // Map over operations and resolve unresolved ones
  TransformOperations resolvedOperations;
  resolvedOperations.reserve(operations.size());

  std::transform(
      operations.begin(),
      operations.end(),
      std::back_inserter(resolvedOperations),
      [&](const auto &operation) -> std::shared_ptr<TransformOperation> {
        if (operation->shouldResolve()) {
          const auto &interpolator = context.interpolators->at(operation->type);
          return interpolator->resolveOperation(operation, context);
        }

        return operation;
      });

  if (shouldBe3D) {
    return std::make_shared<TransformMatrix3D>(matrixFromOperations3D(resolvedOperations));
  }
  return std::make_shared<TransformMatrix2D>(matrixFromOperations2D(resolvedOperations));
}

// Explicit template instantiations
template TransformMatrix2D TransformOperationInterpolator<MatrixOperation>::interpolateMatrix<TransformMatrix2D>(
    double,
    const TransformMatrix::Shared &,
    const TransformMatrix::Shared &) const;
template TransformMatrix3D TransformOperationInterpolator<MatrixOperation>::interpolateMatrix<TransformMatrix3D>(
    double,
    const TransformMatrix::Shared &,
    const TransformMatrix::Shared &) const;

// Template implementations
template <typename TOperation>
TransformOperationInterpolator<TOperation>::TransformOperationInterpolator(
    const std::shared_ptr<TOperation> &defaultOperation)
    : TransformOperationInterpolatorBase<TOperation>(defaultOperation) {}

template <typename TOperation>
std::unique_ptr<TransformOperation> TransformOperationInterpolator<TOperation>::interpolate(
    double progress,
    const std::shared_ptr<TransformOperation> &from,
    const std::shared_ptr<TransformOperation> &to,
    const TransformInterpolationContext &context) const {
  const auto &fromOp = *std::static_pointer_cast<TOperation>(from);
  const auto &toOp = *std::static_pointer_cast<TOperation>(to);

  return std::make_unique<TOperation>(fromOp.value.interpolate(progress, toOp.value));
}

template <ResolvableTransformOp TOperation>
TransformOperationInterpolator<TOperation>::TransformOperationInterpolator(
    const std::shared_ptr<TOperation> &defaultOperation,
    ResolvableValueInterpolatorConfig config)
    : TransformOperationInterpolatorBase<TOperation>(defaultOperation), config_(std::move(config)) {}

template <ResolvableTransformOp TOperation>
std::unique_ptr<TransformOperation> TransformOperationInterpolator<TOperation>::interpolate(
    double progress,
    const std::shared_ptr<TransformOperation> &from,
    const std::shared_ptr<TransformOperation> &to,
    const TransformInterpolationContext &context) const {
  const auto &fromOp = *std::static_pointer_cast<TOperation>(from);
  const auto &toOp = *std::static_pointer_cast<TOperation>(to);

  return std::make_unique<TOperation>(
      fromOp.value.interpolate(progress, toOp.value, getResolvableValueContext(context)));
}

template <ResolvableTransformOp TOperation>
std::shared_ptr<TransformOperation> TransformOperationInterpolator<TOperation>::resolveOperation(
    const std::shared_ptr<TransformOperation> &operation,
    const TransformInterpolationContext &context) const {
  const auto &resolvableOp = std::static_pointer_cast<TOperation>(operation);
  const auto &resolved = resolvableOp->value.resolve(getResolvableValueContext(context));

  if (!resolved.has_value()) {
    throw std::invalid_argument(
        "[Reanimated] Cannot resolve resolvable operation: " + operation->getOperationName() +
        " for node with tag: " + std::to_string(context.node->getTag()));
  }

  return std::make_shared<TOperation>(resolved.value());
}

template <ResolvableTransformOp TOperation>
ResolvableValueInterpolationContext TransformOperationInterpolator<TOperation>::getResolvableValueContext(
    const TransformInterpolationContext &context) const {
  return ResolvableValueInterpolationContext{
      .node = context.node,
      .viewStylesRepository = context.viewStylesRepository,
      .relativeProperty = config_.relativeProperty,
      .relativeTo = config_.relativeTo};
}

// Rotate operations
template class TransformOperationInterpolator<RotateOperation>;
template class TransformOperationInterpolator<RotateXOperation>;
template class TransformOperationInterpolator<RotateYOperation>;
template class TransformOperationInterpolator<RotateZOperation>;

// Scale operations
template class TransformOperationInterpolator<ScaleOperation>;
template class TransformOperationInterpolator<ScaleXOperation>;
template class TransformOperationInterpolator<ScaleYOperation>;

// Skew operations
template class TransformOperationInterpolator<SkewXOperation>;
template class TransformOperationInterpolator<SkewYOperation>;

// Translate operations (resolvable)
template class TransformOperationInterpolator<TranslateXOperation>;
template class TransformOperationInterpolator<TranslateYOperation>;

} // namespace reanimated::css
