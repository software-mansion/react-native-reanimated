#include <reanimated/CSS/interpolation/operations/OperationsStyleInterpolator.h>

#include <reanimated/CSS/interpolation/filters/FilterOperation.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>

namespace reanimated::css {

// OperationsStyleInterpolator implementation

OperationsStyleInterpolator::OperationsStyleInterpolator(
    const PropertyPath &propertyPath,
    const std::shared_ptr<StyleOperationInterpolators> &interpolators,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
    const folly::dynamic &defaultStyleValueDynamic)
    : PropertyInterpolator(propertyPath, viewStylesRepository),
      interpolators_(interpolators),
      defaultStyleValueDynamic_(defaultStyleValueDynamic) {}

folly::dynamic OperationsStyleInterpolator::getStyleValue(const std::shared_ptr<const ShadowNode> &shadowNode) const {
  return viewStylesRepository_->getStyleProp(shadowNode->getTag(), propertyPath_);
}

folly::dynamic OperationsStyleInterpolator::getResetStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const {
  auto styleValue = getStyleValue(shadowNode);

  if (!styleValue.isArray()) {
    return defaultStyleValueDynamic_;
  }

  return styleValue;
}

folly::dynamic OperationsStyleInterpolator::getFirstKeyframeValue() const {
  const auto &fromOperations = keyframes_.front()->fromOperations;
  return fromOperations.has_value() ? convertOperationsToDynamic(fromOperations.value()) : defaultStyleValueDynamic_;
}

folly::dynamic OperationsStyleInterpolator::getLastKeyframeValue() const {
  const auto &toOperations = keyframes_.back()->toOperations;
  return toOperations.has_value() ? convertOperationsToDynamic(toOperations.value()) : defaultStyleValueDynamic_;
}

bool OperationsStyleInterpolator::equalsReversingAdjustedStartValue(const folly::dynamic &propertyValue) const {
  const auto propertyOperations = parseStyleOperations(propertyValue);

  if (!reversingAdjustedStartValue_.has_value()) {
    return !propertyOperations.has_value();
  } else if (!propertyOperations.has_value()) {
    return false;
  }

  const auto &reversingAdjustedOperationsValue = reversingAdjustedStartValue_.value();
  const auto &propertyOperationsValue = propertyOperations.value();

  if (reversingAdjustedOperationsValue.size() != propertyOperationsValue.size()) {
    return false;
  }

  for (size_t i = 0; i < reversingAdjustedOperationsValue.size(); ++i) {
    if (*reversingAdjustedOperationsValue[i] != *propertyOperationsValue[i]) {
      return false;
    }
  }

  return true;
}

folly::dynamic OperationsStyleInterpolator::interpolate(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
    const double fallbackInterpolateThreshold) const {
  const auto currentIndex = getIndexOfCurrentKeyframe(progressProvider);

  // Get or create the current keyframe
  auto keyframe = keyframes_[currentIndex];
  if (!keyframe->fromOperations.has_value() || !keyframe->toOperations.has_value()) {
    // If the value is nullopt, we would have to read it from the view style
    // and build the keyframe again
    const auto fallbackValue = getFallbackValue(shadowNode);
    keyframe = createStyleOperationsKeyframe(
        keyframe->fromOffset,
        keyframe->toOffset,
        keyframe->fromOperations.value_or(fallbackValue),
        keyframe->toOperations.value_or(fallbackValue));
  }

  double progress = progressProvider->getKeyframeProgress(keyframe->fromOffset, keyframe->toOffset);

  if (keyframe->isDiscrete) {
    const auto &operations =
        progress < fallbackInterpolateThreshold ? keyframe->fromOperations.value() : keyframe->toOperations.value();
    return convertOperationsToDynamic(operations);
  }

  // Interpolate the current keyframe
  return interpolateOperations(
      shadowNode,
      progress,
      keyframe->fromOperations.value(),
      keyframe->toOperations.value(),
      fallbackInterpolateThreshold);
}

void OperationsStyleInterpolator::updateKeyframes(jsi::Runtime &rt, const jsi::Value &keyframes) {
  // Step 1: Parse keyframes
  const auto parsedKeyframes = parseJSIKeyframes(rt, keyframes);

  // Step 2: Convert keyframes to StyleOperations
  std::vector<std::pair<double, std::optional<StyleOperations>>> operations;
  operations.reserve(parsedKeyframes.size());
  for (const auto &[offset, value] : parsedKeyframes) {
    operations.emplace_back(offset, parseStyleOperations(rt, value));
  }

  // Step 3: Prepare keyframe interpolation pairs (convert keyframe values in
  // both keyframes to the same type)
  // There will be one less keyframe than the number of keyframes in the jsi
  // array as we create interpolation pairs
  const auto keyframesCount = operations.size() - 1;
  keyframes_.clear();
  keyframes_.reserve(keyframesCount);

  for (size_t i = 0; i < keyframesCount; ++i) {
    keyframes_.push_back(createStyleOperationsKeyframe(
        operations[i].first, operations[i + 1].first, operations[i].second, operations[i + 1].second));
  }
}

void OperationsStyleInterpolator::updateKeyframesFromStyleChange(
    const folly::dynamic &oldStyleValue,
    const folly::dynamic &newStyleValue,
    const folly::dynamic &lastUpdateValue) {
  if (oldStyleValue.isNull()) {
    reversingAdjustedStartValue_ = std::nullopt;
  } else {
    reversingAdjustedStartValue_ = parseStyleOperations(oldStyleValue);
  }

  const auto &prevStyleValue = lastUpdateValue.isNull() ? oldStyleValue : lastUpdateValue;

  keyframes_.clear();
  keyframes_.reserve(1);
  keyframes_.emplace_back(createStyleOperationsKeyframe(
      0,
      1,
      parseStyleOperations(prevStyleValue).value_or(StyleOperations{}),
      parseStyleOperations(newStyleValue).value_or(StyleOperations{})));
}

std::optional<StyleOperations> OperationsStyleInterpolator::parseStyleOperations(
    jsi::Runtime &rt,
    const jsi::Value &values) const {
  if (values.isUndefined()) {
    return std::nullopt;
  }

  const auto operationsArray = values.asObject(rt).asArray(rt);
  const auto operationsCount = operationsArray.size(rt);

  StyleOperations styleOperations;
  styleOperations.reserve(operationsCount);

  for (size_t i = 0; i < operationsCount; ++i) {
    styleOperations.emplace_back(createStyleOperation(rt, operationsArray.getValueAtIndex(rt, i)));
  }

  return styleOperations;
}

std::optional<StyleOperations> OperationsStyleInterpolator::parseStyleOperations(const folly::dynamic &values) const {
  if (values.empty()) {
    return std::nullopt;
  }

  const auto &operationsArray = values;
  const auto operationsCount = operationsArray.size();

  StyleOperations styleOperations;
  styleOperations.reserve(operationsCount);

  for (size_t i = 0; i < operationsCount; ++i) {
    styleOperations.emplace_back(createStyleOperation(operationsArray[i]));
  }

  return styleOperations;
}

std::shared_ptr<StyleOperationsKeyframe> OperationsStyleInterpolator::createStyleOperationsKeyframe(
    const double fromOffset,
    const double toOffset,
    const std::optional<StyleOperations> &fromOperationsOptional,
    const std::optional<StyleOperations> &toOperationsOptional) const {
  bool isDiscrete = false;

  if (fromOperationsOptional.has_value() && toOperationsOptional.has_value()) {
    // Try to create a compatible interpolation pair
    const auto interpolationPair =
        createInterpolationPair(fromOperationsOptional.value(), toOperationsOptional.value());

    if (interpolationPair.has_value()) {
      const auto [fromOperations, toOperations] = interpolationPair.value();
      return std::make_shared<StyleOperationsKeyframe>(
          StyleOperationsKeyframe{fromOffset, toOffset, fromOperations, toOperations, false});
    }

    // If the operations are not compatible, we need to set the keyframe to discrete
    isDiscrete = true;
  }

  return std::make_shared<StyleOperationsKeyframe>(
      StyleOperationsKeyframe{fromOffset, toOffset, fromOperationsOptional, toOperationsOptional, isDiscrete});
}

size_t OperationsStyleInterpolator::getIndexOfCurrentKeyframe(
    const std::shared_ptr<KeyframeProgressProvider> &progressProvider) const {
  const auto progress = progressProvider->getGlobalProgress();

  const auto it = std::lower_bound(
      keyframes_.begin(),
      keyframes_.end(),
      progress,
      [](const std::shared_ptr<StyleOperationsKeyframe> &keyframe, double progress) {
        return keyframe->toOffset < progress;
      });

  // If we're at the end, return the last valid keyframe index
  if (it == keyframes_.end()) {
    return keyframes_.size() - 1;
  }

  return std::distance(keyframes_.begin(), it);
}

StyleOperations OperationsStyleInterpolator::getFallbackValue(
    const std::shared_ptr<const ShadowNode> &shadowNode) const {
  const auto &styleValue = getStyleValue(shadowNode);
  return parseStyleOperations(styleValue).value_or(StyleOperations{});
}

folly::dynamic OperationsStyleInterpolator::interpolateOperations(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const double keyframeProgress,
    const StyleOperations &fromOperations,
    const StyleOperations &toOperations,
    const double fallbackInterpolateThreshold) const {
  auto result = folly::dynamic::array();
  result.reserve(fromOperations.size());

  const auto updateContext = createUpdateContext(shadowNode, fallbackInterpolateThreshold);

  for (size_t i = 0; i < fromOperations.size(); ++i) {
    const auto &fromOperation = fromOperations[i];
    const auto &toOperation = toOperations[i];

    // fromOperation and toOperation have the same type
    const auto &interpolator = interpolators_->at(fromOperation->type);
    const auto interpolationResult =
        interpolator->interpolate(keyframeProgress, fromOperation, toOperation, updateContext);
    result.push_back(interpolationResult->toDynamic());
  }

  return result;
}

folly::dynamic OperationsStyleInterpolator::convertOperationsToDynamic(const StyleOperations &operations) {
  auto result = folly::dynamic::array();
  result.reserve(operations.size());

  for (const auto &operation : operations) {
    result.push_back(operation->toDynamic());
  }

  return result;
}

StyleOperationsInterpolationContext OperationsStyleInterpolator::createUpdateContext(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const double fallbackInterpolateThreshold) const {
  return StyleOperationsInterpolationContext{
      shadowNode, viewStylesRepository_, interpolators_, fallbackInterpolateThreshold};
}

// OperationsStyleInterpolatorBase implementation

template <typename TOperation>
std::shared_ptr<StyleOperation> OperationsStyleInterpolatorBase<TOperation>::createStyleOperation(
    jsi::Runtime &rt,
    const jsi::Value &value) const {
  return TOperation::fromJSIValue(rt, value);
}

template <typename TOperation>
std::shared_ptr<StyleOperation> OperationsStyleInterpolatorBase<TOperation>::createStyleOperation(
    const folly::dynamic &value) const {
  return std::static_pointer_cast<StyleOperation>(TOperation::fromDynamic(value));
}

template <typename TOperation>
std::shared_ptr<TOperation> OperationsStyleInterpolatorBase<TOperation>::getDefaultOperationOfType(
    const size_t type) const {
  return std::static_pointer_cast<TOperation>(interpolators_->at(type)->getDefaultOperation());
}

// Explicit template instantiation
template class OperationsStyleInterpolatorBase<FilterOperation>;
template class OperationsStyleInterpolatorBase<TransformOperation>;

} // namespace reanimated::css
