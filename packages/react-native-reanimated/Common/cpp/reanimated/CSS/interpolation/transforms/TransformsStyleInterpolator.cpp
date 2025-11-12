#include <reanimated/CSS/interpolation/transforms/TransformsStyleInterpolator.h>

namespace reanimated::css {

const folly::dynamic defaultStyleValue = folly::dynamic::array(MatrixOperation(TransformMatrix3D()).toDynamic());

TransformsStyleInterpolator::TransformsStyleInterpolator(
    const PropertyPath &propertyPath,
    const std::shared_ptr<TransformOperationInterpolators> &interpolators,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : OperationsStyleInterpolatorBase<TransformOperation>(
          propertyPath,
          interpolators,
          viewStylesRepository,
          defaultStyleValue) {}

void TransformsStyleInterpolator::addConvertedOperations(
    const std::shared_ptr<TransformOperation> &sourceOperation,
    const std::shared_ptr<TransformOperation> &targetOperation,
    TransformOperations &sourceResult,
    TransformOperations &targetResult) const {
  const auto convertedOps = sourceOperation->convertTo(static_cast<TransformOp>(targetOperation->type));

  targetResult.emplace_back(targetOperation);
  for (size_t k = 0; k < convertedOps.size(); ++k) {
    sourceResult.emplace_back(convertedOps[k]);
    // Converted operations will contain one operation with the same type and
    // can contain more operations derived from the source operation (we need
    // to pair them with operations of the same type with default values)
    if (k > 0) {
      targetResult.emplace_back(getDefaultOperationOfType(static_cast<TransformOp>(convertedOps[k]->type)));
    }
  }
}

std::optional<std::pair<TransformOperations, TransformOperations>> TransformsStyleInterpolator::createInterpolationPair(
    const TransformOperations &fromOperations,
    const TransformOperations &toOperations) const {
  TransformOperations fromOperationsResult, toOperationsResult;
  size_t i = 0, j = 0;
  bool shouldInterpolateMatrices = false;

  // Build index maps and check for matrix operation
  std::unordered_map<uint8_t, size_t> lastIndexInFrom, lastIndexInTo;
  for (size_t idx = 0; idx < fromOperations.size(); ++idx) {
    if (static_cast<TransformOp>(fromOperations[idx]->type) == TransformOp::Matrix) {
      shouldInterpolateMatrices = true;
      break;
    }
    lastIndexInFrom[fromOperations[idx]->type] = idx;
  }
  for (size_t idx = 0; idx < toOperations.size() && !shouldInterpolateMatrices; ++idx) {
    if (static_cast<TransformOp>(toOperations[idx]->type) == TransformOp::Matrix) {
      shouldInterpolateMatrices = true;
      break;
    }
    lastIndexInTo[toOperations[idx]->type] = idx;
  }

  while (!shouldInterpolateMatrices && i < fromOperations.size() && j < toOperations.size()) {
    const auto &fromOperation = fromOperations[i];
    const auto &toOperation = toOperations[j];

    // Case 1: Types match directly
    if (fromOperation->type == toOperation->type) {
      fromOperationsResult.emplace_back(fromOperation);
      toOperationsResult.emplace_back(toOperation);
      i++;
      j++;
    } else if (fromOperation->canConvertTo(static_cast<TransformOp>(toOperation->type))) {
      // Case 2: Operations can be converted to each other's type
      addConvertedOperations(fromOperation, toOperation, fromOperationsResult, toOperationsResult);
      i++;
      j++;
    } else if (toOperation->canConvertTo(static_cast<TransformOp>(fromOperation->type))) {
      addConvertedOperations(toOperation, fromOperation, toOperationsResult, fromOperationsResult);
      i++;
      j++;
    } else {
      // Case 3: Use default values if no conversion possible
      bool toExistsLaterInFrom = lastIndexInFrom.count(toOperation->type) && lastIndexInFrom[toOperation->type] > i;
      bool fromExistsLaterInTo = lastIndexInTo.count(fromOperation->type) && lastIndexInTo[fromOperation->type] > j;

      if (toExistsLaterInFrom == fromExistsLaterInTo) {
        // If neither exists later, or both exist later (were reordered), we
        // cannot interpolate the operations directly and we need to convert
        // these operations to matrices
        shouldInterpolateMatrices = true;
        break;
      } else if (!fromExistsLaterInTo) {
        // If fromOperation does not exist later in toOperations, we can
        // interpolate it to the default value
        fromOperationsResult.emplace_back(fromOperation);
        toOperationsResult.emplace_back(getDefaultOperationOfType(static_cast<TransformOp>(fromOperation->type)));
        i++;
      } else {
        // If toOperation does not exist later in fromOperations, we can
        // interpolate it from the default value
        fromOperationsResult.emplace_back(getDefaultOperationOfType(static_cast<TransformOp>(toOperation->type)));
        toOperationsResult.emplace_back(toOperation);
        j++;
      }
    }
  }

  // Convert all operations to matrices if matrix interpolation is required
  if (shouldInterpolateMatrices) {
    return std::make_pair(
        TransformOperations{std::make_shared<MatrixOperation>(MatrixOperation(fromOperations))},
        TransformOperations{std::make_shared<MatrixOperation>(MatrixOperation(toOperations))});
  }

  // Add remaining operations with default values
  for (; i < fromOperations.size(); ++i) {
    fromOperationsResult.emplace_back(fromOperations[i]);
    toOperationsResult.emplace_back(getDefaultOperationOfType(static_cast<TransformOp>(fromOperations[i]->type)));
  }
  for (; j < toOperations.size(); ++j) {
    fromOperationsResult.emplace_back(getDefaultOperationOfType(static_cast<TransformOp>(toOperations[j]->type)));
    toOperationsResult.emplace_back(toOperations[j]);
  }

  return std::make_pair(fromOperationsResult, toOperationsResult);
}

} // namespace reanimated::css
