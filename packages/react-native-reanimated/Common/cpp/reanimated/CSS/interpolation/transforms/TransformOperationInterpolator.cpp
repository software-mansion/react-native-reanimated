#include <reanimated/CSS/interpolation/transforms/TransformOperationInterpolator.h>

#include <reanimated/CSS/interpolation/transforms/operations/rotate.h>
#include <reanimated/CSS/interpolation/transforms/operations/scale.h>
#include <reanimated/CSS/interpolation/transforms/operations/skew.h>
#include <reanimated/CSS/interpolation/transforms/operations/translate.h>

#include <utility>

namespace reanimated::css {

// Base implementation for simple operations
template <typename TOperation>
std::unique_ptr<StyleOperation> TransformOperationInterpolator<TOperation>::interpolate(
    double progress,
    const std::shared_ptr<StyleOperation> &from,
    const std::shared_ptr<StyleOperation> &to,
    const StyleOperationsInterpolationContext & /* context */) const {
  const auto &fromOp = *std::static_pointer_cast<TOperation>(from);
  const auto &toOp = *std::static_pointer_cast<TOperation>(to);
  return std::make_unique<TOperation>(fromOp.value.interpolate(progress, toOp.value));
}

// Specialization for PerspectiveOperation
TransformOperationInterpolator<PerspectiveOperation>::TransformOperationInterpolator(
    const std::shared_ptr<PerspectiveOperation> &defaultOperation)
    : StyleOperationInterpolator(defaultOperation) {}

std::unique_ptr<StyleOperation> TransformOperationInterpolator<PerspectiveOperation>::interpolate(
    double progress,
    const std::shared_ptr<StyleOperation> &from,
    const std::shared_ptr<StyleOperation> &to,
    const StyleOperationsInterpolationContext & /* context */) const {
  // TODO - check if this implementation is correct
  const auto &fromValue = std::static_pointer_cast<PerspectiveOperation>(from)->value;
  const auto &toValue = std::static_pointer_cast<PerspectiveOperation>(to)->value;

  if (fromValue.value == 0)
    return std::make_unique<PerspectiveOperation>(toValue);
  if (toValue.value == 0)
    return std::make_unique<PerspectiveOperation>(fromValue);

  return std::make_unique<PerspectiveOperation>(fromValue.interpolate(progress, toValue));
}

// Specialization for MatrixOperation
TransformOperationInterpolator<MatrixOperation>::TransformOperationInterpolator(
    const std::shared_ptr<MatrixOperation> &defaultOperation)
    : StyleOperationInterpolator(defaultOperation) {}

std::unique_ptr<StyleOperation> TransformOperationInterpolator<MatrixOperation>::interpolate(
    double progress,
    const std::shared_ptr<StyleOperation> &from,
    const std::shared_ptr<StyleOperation> &to,
    const StyleOperationsInterpolationContext &context) const {
  const auto fromOperation = std::static_pointer_cast<TransformOperation>(from);
  const auto toOperation = std::static_pointer_cast<TransformOperation>(to);
  const auto shouldBe3D = fromOperation->is3D() || toOperation->is3D();

  const auto fromMatrix = matrixFromOperation(fromOperation, shouldBe3D, context);
  const auto toMatrix = matrixFromOperation(toOperation, shouldBe3D, context);

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
    const StyleOperationsInterpolationContext &context) const {
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
          return std::static_pointer_cast<TransformOperation>(interpolator->resolveOperation(operation, context));
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

// Specialization for resolvable operations
template <ResolvableOp TOperation>
TransformOperationInterpolator<TOperation>::TransformOperationInterpolator(
    const std::shared_ptr<TOperation> &defaultOperation,
    ResolvableValueInterpolatorConfig config)
    : StyleOperationInterpolator(defaultOperation), config_(std::move(config)) {}

template <ResolvableOp TOperation>
std::unique_ptr<StyleOperation> TransformOperationInterpolator<TOperation>::interpolate(
    double progress,
    const std::shared_ptr<StyleOperation> &from,
    const std::shared_ptr<StyleOperation> &to,
    const StyleOperationsInterpolationContext &context) const {
  const auto &fromOp = *std::static_pointer_cast<TOperation>(from);
  const auto &toOp = *std::static_pointer_cast<TOperation>(to);

  return std::make_unique<TOperation>(
      fromOp.value.interpolate(progress, toOp.value, getResolvableValueContext(context)));
}

template <ResolvableOp TOperation>
std::shared_ptr<StyleOperation> TransformOperationInterpolator<TOperation>::resolveOperation(
    const std::shared_ptr<StyleOperation> &operation,
    const StyleOperationsInterpolationContext &context) const {
  const auto &resolvableOp = std::static_pointer_cast<TOperation>(operation);
  const auto &resolved = resolvableOp->value.resolve(getResolvableValueContext(context));

  if (!resolved.has_value()) {
    throw std::invalid_argument(
        "[Reanimated] Cannot resolve resolvable operation: " + operation->getOperationName() +
        " for node with tag: " + std::to_string(context.node->getTag()));
  }

  return std::make_shared<TOperation>(resolved.value());
}

template <ResolvableOp TOperation>
ResolvableValueInterpolationContext TransformOperationInterpolator<TOperation>::getResolvableValueContext(
    const StyleOperationsInterpolationContext &context) const {
  return ResolvableValueInterpolationContext{
      .node = context.node,
      .fallbackInterpolateThreshold = context.fallbackInterpolateThreshold,
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
