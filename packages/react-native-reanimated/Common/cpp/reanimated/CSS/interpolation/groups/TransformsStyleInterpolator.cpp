#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/interpolation/groups/TransformsStyleInterpolator.h>

namespace reanimated {

TransformsStyleInterpolator::TransformsStyleInterpolator(
    const std::shared_ptr<TransformInterpolators> &interpolators,
    const PropertyPath &propertyPath,
    const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : PropertyInterpolator(
          propertyPath,
          progressProvider,
          viewStylesRepository),
      interpolators_(interpolators) {}

jsi::Value TransformsStyleInterpolator::getStyleValue(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) const {
  return viewStylesRepository_->getStyleProp(
      rt, shadowNode->getTag(), propertyPath_);
}

jsi::Value TransformsStyleInterpolator::getCurrentValue(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) const {
  if (previousResult_.has_value()) {
    return convertResultToJSI(rt, previousResult_.value());
  }
  return getStyleValue(rt, shadowNode);
}

jsi::Value TransformsStyleInterpolator::getFirstKeyframeValue(
    jsi::Runtime &rt) const {
  const auto fromOperations = keyframes_.front()->fromOperations;
  return fromOperations.has_value()
      ? convertResultToJSI(rt, fromOperations.value())
      : getDefaultValue(rt);
}

jsi::Value TransformsStyleInterpolator::getLastKeyframeValue(
    jsi::Runtime &rt) const {
  const auto toOperations = keyframes_.back()->toOperations;
  return toOperations.has_value() ? convertResultToJSI(rt, toOperations.value())
                                  : getDefaultValue(rt);
}

jsi::Value TransformsStyleInterpolator::update(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) {
  updateCurrentKeyframe(rt, shadowNode);

  // Get or create the current keyframe
  auto &keyframe = currentKeyframe_;
  if (!keyframe->fromOperations.has_value() ||
      !keyframe->toOperations.has_value()) {
    // If the value is nullopt, we would have to read it from the view style
    // and build the keyframe again
    const auto fallbackValue = getFallbackValue(rt, shadowNode);
    const auto &fromOperations = keyframe->fromOperations.has_value()
        ? keyframe->fromOperations.value()
        : fallbackValue;
    const auto &toOperations = keyframe->toOperations.has_value()
        ? keyframe->toOperations.value()
        : fallbackValue;
    keyframe = createTransformKeyframe(
        keyframe->fromOffset, keyframe->toOffset, fromOperations, toOperations);
  }

  // Interpolate the current keyframe
  TransformOperations result = interpolateOperations(
      shadowNode,
      progressProvider_->getKeyframeProgress(
          keyframe->fromOffset, keyframe->toOffset),
      keyframe->fromOperations.value(),
      keyframe->toOperations.value());

  // Convert the result to JSI value
  auto updates = convertResultToJSI(rt, result);
  previousResult_ = std::move(result);

  return updates;
}

jsi::Value TransformsStyleInterpolator::reset(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) {
  previousResult_ = std::nullopt;
  auto resetStyle = getStyleValue(rt, shadowNode);

  if (resetStyle.isUndefined()) {
    return getDefaultValue(rt);
  }

  return resetStyle;
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
        operations[i].first,
        operations[i + 1].first,
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

  const auto fromOperations =
      previousResult_.value_or(parseTransformOperations(rt, oldStyleValue)
                                   .value_or(TransformOperations{}));
  const auto toOperations = parseTransformOperations(rt, newStyleValue)
                                .value_or(TransformOperations{});
  keyframes_.push_back(
      createTransformKeyframe(0, 1, fromOperations, toOperations));
}

std::optional<TransformOperations>
TransformsStyleInterpolator::parseTransformOperations(
    jsi::Runtime &rt,
    const jsi::Value &values) {
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
    const double fromOffset,
    const double toOffset,
    const std::optional<TransformOperations> &fromOperationsOptional,
    const std::optional<TransformOperations> &toOperationsOptional) const {
  // If nullopt is passed, return values as is (we will have to read the
  // transform value from the view style later on and create the new keyframe
  // then)
  if (!fromOperationsOptional.has_value() ||
      !toOperationsOptional.has_value()) {
    return std::make_shared<TransformKeyframe>(TransformKeyframe{
        fromOffset, toOffset, fromOperationsOptional, toOperationsOptional});
  }

  const auto [fromOperations, toOperations] = createTransformInterpolationPair(
      fromOperationsOptional.value(), toOperationsOptional.value());
  return std::make_shared<TransformKeyframe>(
      TransformKeyframe{fromOffset, toOffset, fromOperations, toOperations});
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

std::pair<TransformOperations, TransformOperations>
TransformsStyleInterpolator::createTransformInterpolationPair(
    const TransformOperations &fromOperations,
    const TransformOperations &toOperations) const {
  TransformOperations fromOperationsResult, toOperationsResult;
  size_t i = 0, j = 0;
  bool shouldInterpolateMatrices = false;

  // Build index maps and check for matrix operation
  std::unordered_map<TransformOperationType, size_t> lastIndexInFrom,
      lastIndexInTo;
  for (size_t idx = 0; idx < fromOperations.size(); ++idx) {
    if (fromOperations[idx]->type == TransformOperationType::Matrix) {
      shouldInterpolateMatrices = true;
      break;
    }
    lastIndexInFrom[fromOperations[idx]->type] = idx;
  }
  for (size_t idx = 0; idx < toOperations.size() && !shouldInterpolateMatrices;
       ++idx) {
    if (toOperations[idx]->type == TransformOperationType::Matrix) {
      shouldInterpolateMatrices = true;
      break;
    }
    lastIndexInTo[toOperations[idx]->type] = idx;
  }

  while (!shouldInterpolateMatrices && i < fromOperations.size() &&
         j < toOperations.size()) {
    const auto &fromOperation = fromOperations[i];
    const auto &toOperation = toOperations[j];

    // Case 1: Types match directly
    if (fromOperation->type == toOperation->type) {
      fromOperationsResult.emplace_back(fromOperation);
      toOperationsResult.emplace_back(toOperation);
      i++;
      j++;
    } else if (fromOperation->canConvertTo(toOperation->type)) {
      // Case 2: Operations can be converted to each other's type
      addConvertedOperations(
          fromOperation, toOperation, fromOperationsResult, toOperationsResult);
      i++;
      j++;
    } else if (toOperation->canConvertTo(fromOperation->type)) {
      addConvertedOperations(
          toOperation, fromOperation, toOperationsResult, fromOperationsResult);
      i++;
      j++;
    } else {
      // Case 3: Use default values if no conversion possible
      bool toExistsLaterInFrom = lastIndexInFrom.count(toOperation->type) &&
          lastIndexInFrom[toOperation->type] > i;
      bool fromExistsLaterInTo = lastIndexInTo.count(fromOperation->type) &&
          lastIndexInTo[fromOperation->type] > j;

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
        toOperationsResult.emplace_back(
            getDefaultOperationOfType(fromOperation->type));
        i++;
      } else {
        // If toOperation does not exist later in fromOperations, we can
        // interpolate it from the default value
        fromOperationsResult.emplace_back(
            getDefaultOperationOfType(toOperation->type));
        toOperationsResult.emplace_back(toOperation);
        j++;
      }
    }
  }

  // Convert all operations to matrices if matrix interpolation is required
  if (shouldInterpolateMatrices) {
    return std::make_pair(
        TransformOperations{
            std::make_shared<MatrixOperation>(MatrixOperation(fromOperations))},
        TransformOperations{
            std::make_shared<MatrixOperation>(MatrixOperation(toOperations))});
  }

  // Add remaining operations with default values
  for (; i < fromOperations.size(); ++i) {
    fromOperationsResult.emplace_back(fromOperations[i]);
    toOperationsResult.emplace_back(
        getDefaultOperationOfType(fromOperations[i]->type));
  }
  for (; j < toOperations.size(); ++j) {
    fromOperationsResult.emplace_back(
        getDefaultOperationOfType(toOperations[j]->type));
    toOperationsResult.emplace_back(toOperations[j]);
  }

  return std::make_pair(fromOperationsResult, toOperationsResult);
}

jsi::Value TransformsStyleInterpolator::getDefaultValue(
    jsi::Runtime &rt) const {
  jsi::Array transformsArray(rt, 1);
  transformsArray.setValueAtIndex(
      rt, 0, MatrixOperation(TransformMatrix::Identity()).toJSIValue(rt));
  return transformsArray;
}

TransformOperations TransformsStyleInterpolator::getFallbackValue(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) const {
  const jsi::Value &styleValue = getStyleValue(rt, shadowNode);
  return parseTransformOperations(rt, styleValue)
      .value_or(TransformOperations{});
}

std::shared_ptr<TransformOperation>
TransformsStyleInterpolator::getDefaultOperationOfType(
    const TransformOperationType type) const {
  return interpolators_->at(type)->getDefaultOperation();
}

TransformOperations TransformsStyleInterpolator::resolveTransformOperations(
    const ShadowNode::Shared &shadowNode,
    const TransformOperations &unresolvedOperations) const {
  return interpolateOperations(
      shadowNode, 0, unresolvedOperations, unresolvedOperations);
}

std::shared_ptr<TransformKeyframe>
TransformsStyleInterpolator::getKeyframeAtIndex(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode,
    const size_t index,
    const int resolveDirection) const {
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
          keyframe->fromOffset,
          keyframe->toOffset,
          resolveTransformOperations(shadowNode, unresolvedOperations.value()),
          keyframe->toOperations});
    } else {
      return std::make_shared<TransformKeyframe>(TransformKeyframe{
          keyframe->fromOffset,
          keyframe->toOffset,
          keyframe->fromOperations,
          resolveTransformOperations(
              shadowNode, unresolvedOperations.value())});
    }
  }

  // If the operations are not specified, we would have to read the transform
  // value from the view style and create the new keyframe then
  const auto fallbackValue = getFallbackValue(rt, shadowNode);
  if (resolveDirection < 0) {
    return createTransformKeyframe(
        keyframe->fromOffset,
        keyframe->toOffset,
        resolveTransformOperations(shadowNode, fallbackValue),
        keyframe->toOperations);
  } else {
    return createTransformKeyframe(
        keyframe->fromOffset,
        keyframe->toOffset,
        keyframe->fromOperations,
        resolveTransformOperations(shadowNode, fallbackValue));
  }
}

void TransformsStyleInterpolator::updateCurrentKeyframe(
    jsi::Runtime &rt,
    const ShadowNode::Shared &shadowNode) {
  const auto progress = progressProvider_->getGlobalProgress();
  const bool isProgressLessThanHalf = progress < 0.5;
  const auto prevIndex = keyframeIndex_;
  if (progressProvider_->isFirstUpdate()) {
    keyframeIndex_ = isProgressLessThanHalf ? 0 : keyframes_.size() - 1;
  }

  while (keyframeIndex_ < keyframes_.size() - 1 &&
         keyframes_[keyframeIndex_ + 1]->fromOffset < progress)
    ++keyframeIndex_;

  while (keyframeIndex_ > 0 &&
         keyframes_[keyframeIndex_]->fromOffset >= progress)
    --keyframeIndex_;

  if (progressProvider_->isFirstUpdate()) {
    currentKeyframe_ = getKeyframeAtIndex(
        rt, shadowNode, keyframeIndex_, isProgressLessThanHalf ? -1 : 1);
  } else if (keyframeIndex_ != prevIndex) {
    currentKeyframe_ = getKeyframeAtIndex(
        rt, shadowNode, keyframeIndex_, prevIndex - keyframeIndex_);
  }
}

TransformOperations TransformsStyleInterpolator::interpolateOperations(
    const ShadowNode::Shared &shadowNode,
    const double keyframeProgress,
    const TransformOperations &fromOperations,
    const TransformOperations &toOperations) const {
  TransformOperations result;
  result.reserve(fromOperations.size());
  const auto transformUpdateContext = createUpdateContext(shadowNode);

  for (size_t i = 0; i < fromOperations.size(); ++i) {
    const auto &fromOperation = fromOperations[i];
    const auto &toOperation = toOperations[i];

    // fromOperation and toOperation have the same type
    const auto &interpolator = interpolators_->at(fromOperation->type);
    result.emplace_back(interpolator->interpolate(
        keyframeProgress,
        *fromOperation,
        *toOperation,
        transformUpdateContext));
  }

  return result;
}

jsi::Value TransformsStyleInterpolator::convertResultToJSI(
    jsi::Runtime &rt,
    const TransformOperations &operations) {
  jsi::Array result(rt, operations.size());

  for (size_t i = 0; i < operations.size(); ++i) {
    const auto &operation = operations[i];
    result.setValueAtIndex(rt, i, operation->toJSIValue(rt));
  }

  return result;
}

TransformInterpolatorUpdateContext
TransformsStyleInterpolator::createUpdateContext(
    const ShadowNode::Shared &shadowNode) const {
  return TransformInterpolatorUpdateContext{
      shadowNode, viewStylesRepository_, interpolators_};
}

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
