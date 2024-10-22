#include <reanimated/CSS/interpolation/groups/TransformsStyleInterpolator.h>

namespace reanimated {

TransformsStyleInterpolator::TransformsStyleInterpolator(
    const TransformInterpolators &interpolators,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const PropertyPath &propertyPath)
    : PropertyInterpolator(propertyPath),
      interpolators_(interpolators),
      viewStylesRepository_(viewStylesRepository) {}

jsi::Value TransformsStyleInterpolator::getStyleValue(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) const {
  return viewStylesRepository_->getStyleProp(
      rt, shadowNode->getTag(), propertyPath_);
}

jsi::Value TransformsStyleInterpolator::update(
    const InterpolationUpdateContext &context) {
  updateCurrentKeyframe(context);

  // Get or create the current keyframe
  auto &keyframe = currentKeyframe_;
  if (!keyframe->fromOperations.has_value() ||
      !keyframe->toOperations.has_value()) {
    // If the value is nullopt, we would have to read it from the view style
    // and build the keyframe again
    const auto fallbackValue = getFallbackValue(context);
    const auto &fromOperations = keyframe->fromOperations.has_value()
        ? keyframe->fromOperations.value()
        : fallbackValue;
    const auto &toOperations = keyframe->toOperations.has_value()
        ? keyframe->toOperations.value()
        : fallbackValue;
    keyframe = createTransformKeyframe(
        context.rt, keyframe->offset, fromOperations, toOperations);
  }
  // Calculate the local progress for the current keyframe
  const auto progress = calculateLocalProgress(context.progress);
  // Interpolate the current keyframe
  TransformOperations result = interpolateOperations(
      progress,
      keyframe->fromOperations.value(),
      keyframe->toOperations.value(),
      context);

  // Convert the result to JSI value
  auto updates = convertResultToJSI(context.rt, result);
  previousResult_ = std::move(result);
  return updates;
}

void TransformsStyleInterpolator::updateKeyframes(
    jsi::Runtime &rt,
    const jsi::Value &keyframes) {
  keyframeIndex_ = 0;

  // Step 1: Parse keyframes
  const auto parsedKeyframes = parseJSIKeyframes(rt, keyframes);

  // Step 2: Convert keyframes to TransformOperations
  std::vector<std::pair<double, std::optional<TransformOperations>>> operations;
  operations.reserve(parsedKeyframes.size());
  for (const auto &[offset, value] : parsedKeyframes) {
    operations.emplace_back(offset, parseTransformOperations(rt, value));
  }

  // Step 3: Prepare keyframe interpolation pairs (convert keyframe values in
  // both keyframes to the same type)
  // There will be one less keyframe than the number of keyframes in the jsi
  // array as we create interpolation pairs
  const auto keyframesCount = operations.size() - 1;
  keyframes_.clear();
  keyframes_.reserve(keyframesCount);

  for (size_t i = 0; i < keyframesCount; ++i) {
    keyframes_.push_back(createTransformKeyframe(
        rt,
        operations[i].first,
        operations[i].second,
        operations[i + 1].second));
  }
}

void TransformsStyleInterpolator::updateKeyframesFromStyleChange(
    jsi::Runtime &rt,
    const jsi::Value &oldStyleValue,
    const jsi::Value &newStyleValue) {
  keyframeIndex_ = 0;
  keyframes_.clear();
  keyframes_.reserve(1);
  keyframes_.push_back(createTransformKeyframe(
      rt,
      0,
      previousResult_.value_or(parseTransformOperations(rt, oldStyleValue)
                                   .value_or(TransformOperations{})),
      parseTransformOperations(rt, newStyleValue)
          .value_or(TransformOperations{})));
}

TransformInterpolators TransformsStyleInterpolator::convertInterpolators(
    const TransformInterpolatorsMap &interpolators) const {
  TransformInterpolators result;

  for (const auto &[property, interpolator] : interpolators) {
    result[getTransformOperationType(property)] = interpolator;
  }

  return result;
}

std::optional<TransformOperations>
TransformsStyleInterpolator::parseTransformOperations(
    jsi::Runtime &rt,
    const jsi::Value &values) const {
  if (values.isUndefined()) {
    return std::nullopt;
  }

  const auto transformsArray = values.asObject(rt).asArray(rt);
  const auto transformsCount = transformsArray.size(rt);

  TransformOperations transformOperations;
  transformOperations.reserve(transformsCount);

  for (size_t i = 0; i < transformsCount; ++i) {
    const auto transform = transformsArray.getValueAtIndex(rt, i);
    transformOperations.emplace_back(
        TransformOperation::fromJSIValue(rt, transform));
  }
  return std::move(transformOperations);
}

std::shared_ptr<TransformKeyframe>
TransformsStyleInterpolator::createTransformKeyframe(
    jsi::Runtime &rt,
    const double offset,
    const std::optional<TransformOperations> &fromOperationsOptional,
    const std::optional<TransformOperations> &toOperationsOptional) const {
  // If nullopt is passed, return values as is (we will have to read the
  // transform value from the view style later on and create the new keyframe
  // then)
  if (!fromOperationsOptional.has_value() ||
      !toOperationsOptional.has_value()) {
    return std::make_shared<TransformKeyframe>(TransformKeyframe{
        offset, fromOperationsOptional, toOperationsOptional});
  }

  const auto &fromOperations = fromOperationsOptional.value();
  const auto &toOperations = toOperationsOptional.value();

  TransformOperations fromOperationsResult, toOperationsResult;
  size_t i = 0, j = 0;

  if (!fromOperations.empty() && !toOperations.empty()) {
    std::unordered_map<TransformOperationType, size_t> lastIndexInFrom;
    for (size_t idx = 0; idx < fromOperations.size(); ++idx) {
      lastIndexInFrom[fromOperations[idx]->type] = idx;
    }
    std::unordered_map<TransformOperationType, size_t> lastIndexInTo;
    for (size_t idx = 0; idx < toOperations.size(); ++idx) {
      lastIndexInTo[toOperations[idx]->type] = idx;
    }
    bool shouldInterpolateMatrices = false;

    while (i < fromOperations.size() && j < toOperations.size()) {
      const auto &fromOperation = fromOperations[i];
      const auto &toOperation = toOperations[j];
      const auto &fromType = fromOperation->type;
      const auto &toType = toOperation->type;

      if (fromType == TransformOperationType::Matrix ||
          toType == TransformOperationType::Matrix) {
        shouldInterpolateMatrices = true;
        break;
      }

      if (fromType == toType) {
        fromOperationsResult.emplace_back(fromOperation);
        toOperationsResult.emplace_back(toOperation);
        i++;
        j++;
      }
      // Check if fromOperation can be converted to toOperation's type
      else if (fromOperation->canConvertTo(toType)) {
        addConvertedOperations(
            fromOperation,
            toOperation,
            fromOperationsResult,
            toOperationsResult);
        i++;
        j++;
      }
      // Check if toOperation can be converted to fromOperation's type
      else if (toOperation->canConvertTo(fromType)) {
        addConvertedOperations(
            toOperation,
            fromOperation,
            toOperationsResult,
            fromOperationsResult);
        i++;
        j++;
      } else {
        bool toExistsLaterInFrom = lastIndexInFrom[toType] > i;
        bool fromExistsLaterInTo = lastIndexInTo[fromType] > j;

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
          toOperationsResult.emplace_back(getDefaultOperationOfType(fromType));
          i++;
        } else {
          // If toOperation does not exist later in fromOperations, we can
          // interpolate it from the default value
          fromOperationsResult.emplace_back(getDefaultOperationOfType(toType));
          toOperationsResult.emplace_back(toOperation);
          j++;
        }
      }
    }

    // If at least one matrix operation is found in the transform operations or
    // we cannot interpolate between keyframes without converting part of them
    // to the matrix, we would have to convert ALL operations to matrices
    // because React Native transformations implementation is broken and ignores
    // the matrix transformation if at least one of other transformations is
    // present in the transforms array
    if (shouldInterpolateMatrices) {
      return std::make_shared<TransformKeyframe>(TransformKeyframe{
          offset,
          TransformOperations{std::make_shared<MatrixOperation>(
              MatrixOperation(fromOperations))},
          TransformOperations{std::make_shared<MatrixOperation>(
              MatrixOperation(toOperations))}});
    }
  }

  // Pair remaining operations with default values
  // If from operations are remaining
  for (; i < fromOperations.size(); ++i) {
    fromOperationsResult.emplace_back(fromOperations[i]);
    toOperationsResult.emplace_back(
        getDefaultOperationOfType(fromOperations[i]->type));
  }
  // If to operations are remaining
  for (; j < toOperations.size(); ++j) {
    fromOperationsResult.emplace_back(
        getDefaultOperationOfType(toOperations[j]->type));
    toOperationsResult.emplace_back(toOperations[j]);
  }

  return std::make_shared<TransformKeyframe>(
      TransformKeyframe{offset, fromOperationsResult, toOperationsResult});
}

void TransformsStyleInterpolator::addConvertedOperations(
    const std::shared_ptr<TransformOperation> &sourceOperation,
    const std::shared_ptr<TransformOperation> &targetOperation,
    TransformOperations &sourceResult,
    TransformOperations &targetResult) const {
  const auto convertedOps = sourceOperation->convertTo(targetOperation->type);

  targetResult.emplace_back(targetOperation);
  for (size_t k = 0; k < convertedOps.size(); ++k) {
    sourceResult.emplace_back(convertedOps[k]);
    // Converted operations will contain one operation with the same type and
    // can contain more operations derived from the source operation (we need
    // to pair them with operations of the same type with default values)
    if (k > 0) {
      targetResult.emplace_back(
          getDefaultOperationOfType(convertedOps[k]->type));
    }
  }
}

TransformOperations TransformsStyleInterpolator::getFallbackValue(
    const InterpolationUpdateContext context) const {
  const jsi::Value &styleValue = getStyleValue(context.rt, context.node);
  return parseTransformOperations(context.rt, styleValue)
      .value_or(TransformOperations{});
}

std::shared_ptr<TransformOperation>
TransformsStyleInterpolator::getDefaultOperationOfType(
    TransformOperationType type) const {
  return interpolators_.at(type)->getDefaultOperation();
}

TransformOperations TransformsStyleInterpolator::resolveTransformOperations(
    const std::optional<TransformOperations> &unresolvedOperations,
    const InterpolationUpdateContext &context) const {
  // TODO - implement once interpolators are ready
  return unresolvedOperations.value_or(TransformOperations{});
}

std::shared_ptr<TransformKeyframe>
TransformsStyleInterpolator::getKeyframeAtIndex(
    size_t index,
    int resolveDirection,
    const InterpolationUpdateContext &context) const {
  const auto &keyframe = keyframes_.at(index);

  if (resolveDirection == 0) {
    return keyframe;
  }

  auto &unresolvedOperations =
      resolveDirection < 0 ? keyframe->fromOperations : keyframe->toOperations;

  // If keyframe operations are specified, we can just create a keyframe with
  // the resolved operations
  if (unresolvedOperations.has_value()) {
    if (resolveDirection < 0) {
      return std::make_shared<TransformKeyframe>(TransformKeyframe{
          keyframe->offset,
          resolveTransformOperations(unresolvedOperations, context),
          keyframe->toOperations});
    } else {
      return std::make_shared<TransformKeyframe>(TransformKeyframe{
          keyframe->offset,
          keyframe->fromOperations,
          resolveTransformOperations(unresolvedOperations, context)});
    }
  }

  // If the operations are not specified, we would have to read the transform
  // value from the view style and create the new keyframe then
  const auto fallbackValue = getFallbackValue(context);
  if (resolveDirection < 0) {
    const auto newKeyframe = createTransformKeyframe(
        context.rt, keyframe->offset, fallbackValue, keyframe->toOperations);
    return {std::make_shared<TransformKeyframe>(TransformKeyframe{
        newKeyframe->offset,
        resolveTransformOperations(newKeyframe->fromOperations, context),
        newKeyframe->toOperations})};
  } else {
    const auto newKeyframe = createTransformKeyframe(
        context.rt, keyframe->offset, keyframe->fromOperations, fallbackValue);
    return {std::make_shared<TransformKeyframe>(TransformKeyframe{
        newKeyframe->offset,
        newKeyframe->fromOperations,
        resolveTransformOperations(newKeyframe->toOperations, context)})};
  }
}

void TransformsStyleInterpolator::updateCurrentKeyframe(
    const InterpolationUpdateContext &context) {
  const bool isProgressLessThanHalf = context.progress < 0.5;
  const auto prevIndex = keyframeIndex_;

  if (!context.previousProgress.has_value()) {
    keyframeIndex_ = isProgressLessThanHalf ? 0 : keyframes_.size() - 1;
  }

  while (keyframeIndex_ < keyframes_.size() - 1 &&
         keyframes_[keyframeIndex_ + 1]->offset < context.progress)
    ++keyframeIndex_;

  while (keyframeIndex_ > 0 &&
         keyframes_[keyframeIndex_]->offset >= context.progress)
    --keyframeIndex_;

  if (context.previousProgress.has_value()) {
    if (keyframeIndex_ != prevIndex) {
      currentKeyframe_ = getKeyframeAtIndex(
          keyframeIndex_, prevIndex - keyframeIndex_, context);
    } else if (context.directionChanged && previousResult_.has_value()) {
      currentKeyframe_ = getKeyframeAtIndex(keyframeIndex_, 0, context);
      if (context.progress < context.previousProgress.value()) {
        currentKeyframe_ = createTransformKeyframe(
            context.rt,
            currentKeyframe_->offset,
            currentKeyframe_->fromOperations,
            previousResult_);
      } else {
        currentKeyframe_ = createTransformKeyframe(
            context.rt,
            currentKeyframe_->offset,
            previousResult_,
            currentKeyframe_->toOperations);
      }
    }
  } else {
    currentKeyframe_ = getKeyframeAtIndex(
        keyframeIndex_, isProgressLessThanHalf ? -1 : 1, context);
  }
}

double TransformsStyleInterpolator::calculateLocalProgress(
    const double progress) const {
  const auto fromOffset = keyframes_[keyframeIndex_]->offset;
  const auto toOffset = keyframeIndex_ < keyframes_.size() - 1
      ? keyframes_[keyframeIndex_ + 1]->offset
      : 1;
  if (toOffset == fromOffset) {
    return 1;
  }
  return (progress - fromOffset) / (toOffset - fromOffset);
}

TransformOperations TransformsStyleInterpolator::interpolateOperations(
    const double localProgress,
    const TransformOperations &fromOperations,
    const TransformOperations &toOperations,
    const InterpolationUpdateContext &context) const {
  TransformOperations result;
  result.reserve(fromOperations.size());

  for (size_t i = 0; i < fromOperations.size(); ++i) {
    const auto fromOperation = fromOperations[i];
    const auto toOperation = toOperations[i];

    const auto &interpolator = interpolators_.at(fromOperation->type);
    result.emplace_back(interpolator->interpolate(
        localProgress, *fromOperation, *toOperation, context));
  }

  return result;
}

jsi::Value TransformsStyleInterpolator::convertResultToJSI(
    jsi::Runtime &rt,
    const TransformOperations &operations) const {
  jsi::Array result(rt, operations.size());

  for (size_t i = 0; i < operations.size(); ++i) {
    const auto &operation = operations[i];
    result.setValueAtIndex(rt, i, operation->toJSIValue(rt));
  }

  return result;
}

} // namespace reanimated
