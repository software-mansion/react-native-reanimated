#include <reanimated/CSS/interpolation/filters/FilterStyleInterpolator.h>
#include <reanimated/CSS/interpolation/filters/operations/contrast.h>

#include <memory>
#include <unordered_map>
#include <utility>
#include <vector>

#include <reanimated/CSS/interpolation/transforms/TransformsStyleInterpolator.h>

namespace reanimated::css {

const FilterOperations FilterStyleInterpolator::defaultStyleValue_ = {
    std::make_shared<ContrastOperation>(1.0)};

FilterStyleInterpolator::FilterStyleInterpolator(
    const PropertyPath &propertyPath,
    const std::shared_ptr<FilterOperationInterpolators> &interpolators,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : PropertyInterpolator(propertyPath, viewStylesRepository), interpolators_(interpolators) {}

folly::dynamic FilterStyleInterpolator::getStyleValue(const std::shared_ptr<const ShadowNode> &shadowNode) const {
  return viewStylesRepository_->getStyleProp(shadowNode->getTag(), propertyPath_);
}

folly::dynamic FilterStyleInterpolator::getResetStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const {
  auto styleValue = getStyleValue(shadowNode);

  if (!styleValue.isArray()) {
    return convertOperationsToDynamic(defaultStyleValue_);
  }

  return styleValue;
}

folly::dynamic FilterStyleInterpolator::getFirstKeyframeValue() const {
  return convertOperationsToDynamic(keyframes_.front()->fromOperations.value_or(defaultStyleValue_));
}

folly::dynamic FilterStyleInterpolator::getLastKeyframeValue() const {
  return convertOperationsToDynamic(keyframes_.back()->toOperations.value_or(defaultStyleValue_));
}

bool FilterStyleInterpolator::equalsReversingAdjustedStartValue(const folly::dynamic &propertyValue) const {
  const auto propertyOperations = parseFilterOperations(propertyValue);

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

folly::dynamic FilterStyleInterpolator::interpolate(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
    const double) const {
  const auto currentIndex = getIndexOfCurrentKeyframe(progressProvider);

  // Get or create the current keyframe
  auto keyframe = keyframes_[currentIndex];
  if (!keyframe->fromOperations.has_value() || !keyframe->toOperations.has_value()) {
    // If the value is nullopt, we would have to read it from the view style
    // and build the keyframe again
    const auto fallbackValue = getFallbackValue(shadowNode);
    keyframe = createFilterKeyframe(
        keyframe->fromOffset,
        keyframe->toOffset,
        keyframe->fromOperations.value_or(fallbackValue),
        keyframe->toOperations.value_or(fallbackValue));
  }

  // Interpolate the current keyframe
  return interpolateOperations(
      shadowNode,
      progressProvider->getKeyframeProgress(keyframe->fromOffset, keyframe->toOffset),
      keyframe->fromOperations.value(),
      keyframe->toOperations.value());
}

void FilterStyleInterpolator::updateKeyframes(jsi::Runtime &rt, const jsi::Value &keyframes) {
  // Step 1: Parse keyframes
  const auto parsedKeyframes = parseJSIKeyframes(rt, keyframes);

  // Step 2: Convert keyframes to FilterOperations
  std::vector<std::pair<double, std::optional<FilterOperations>>> operations;
  operations.reserve(parsedKeyframes.size());
  for (const auto &[offset, value] : parsedKeyframes) {
    operations.emplace_back(offset, parseFilterOperations(rt, value));
  }

  // Step 3: Prepare keyframe interpolation pairs (convert keyframe values in
  // both keyframes to the same type)
  // There will be one less keyframe than the number of keyframes in the jsi
  // array as we create interpolation pairs
  const auto keyframesCount = operations.size() - 1;
  keyframes_.clear();
  keyframes_.reserve(keyframesCount);

  for (size_t i = 0; i < keyframesCount; ++i) {
    keyframes_.push_back(createFilterKeyframe(
        operations[i].first, operations[i + 1].first, operations[i].second, operations[i + 1].second));
  }
}

void FilterStyleInterpolator::updateKeyframesFromStyleChange(
    const folly::dynamic &oldStyleValue,
    const folly::dynamic &newStyleValue,
    const folly::dynamic &lastUpdateValue) {
  if (oldStyleValue.isNull()) {
    reversingAdjustedStartValue_ = std::nullopt;
  } else {
    reversingAdjustedStartValue_ = parseFilterOperations(oldStyleValue);
  }

  const auto &prevStyleValue = lastUpdateValue.isNull() ? oldStyleValue : lastUpdateValue;

  keyframes_.clear();
  keyframes_.reserve(1);
  keyframes_.emplace_back(createFilterKeyframe(
      0,
      1,
      parseFilterOperations(prevStyleValue).value_or(FilterOperations{}),
      parseFilterOperations(newStyleValue).value_or(FilterOperations{})));
}

std::optional<FilterOperations> FilterStyleInterpolator::parseFilterOperations(
    jsi::Runtime &rt,
    const jsi::Value &values) {
  if (values.isUndefined()) {
    return std::nullopt;
  }

  const auto filtersArray = values.asObject(rt).asArray(rt);
  const auto filtersCount = filtersArray.size(rt);

  FilterOperations filterOperations;
  filterOperations.reserve(filtersCount);

  for (size_t i = 0; i < filtersCount; ++i) {
    const auto filter = filtersArray.getValueAtIndex(rt, i);
    filterOperations.emplace_back(FilterOperation::fromJSIValue(rt, filter));
  }
  return filterOperations;
}

std::optional<FilterOperations> FilterStyleInterpolator::parseFilterOperations(const folly::dynamic &values) {
  if (values.empty()) {
    return std::nullopt;
  }

  const auto &filtersArray = values;
  const auto filtersCount = filtersArray.size();

  FilterOperations filterOperations;
  filterOperations.reserve(filtersCount);

  for (size_t i = 0; i < filtersCount; ++i) {
    const auto &filter = filtersArray[i];
    filterOperations.emplace_back(FilterOperation::fromDynamic(filter));
  }
  return filterOperations;
}

std::shared_ptr<FilterKeyframe> FilterStyleInterpolator::createFilterKeyframe(
    const double fromOffset,
    const double toOffset,
    const std::optional<FilterOperations> &fromOperationsOptional,
    const std::optional<FilterOperations> &toOperationsOptional) const {
  // If nullopt is passed, return values as is (we will have to read the
  // filter value from the view style later on and create the new keyframe
  // then)
  if (!fromOperationsOptional.has_value() || !toOperationsOptional.has_value()) {
    return std::make_shared<FilterKeyframe>(
        FilterKeyframe{fromOffset, toOffset, fromOperationsOptional, toOperationsOptional});
  }

  const auto [fromOperations, toOperations] =
      createFilterInterpolationPair(fromOperationsOptional.value(), toOperationsOptional.value());
  return std::make_shared<FilterKeyframe>(FilterKeyframe{fromOffset, toOffset, fromOperations, toOperations});
}

std::pair<FilterOperations, FilterOperations> FilterStyleInterpolator::createFilterInterpolationPair(
    const FilterOperations &fromOperations,
    const FilterOperations &toOperations) const {
  FilterOperations fromOperationsResult, toOperationsResult;
  size_t i = 0, j = 0;

  // Build index maps and check for matrix operation
  std::unordered_map<FilterOp, size_t> lastIndexInFrom, lastIndexInTo;
  for (size_t idx = 0; idx < fromOperations.size(); ++idx) {
    lastIndexInFrom[fromOperations[idx]->type] = idx;
  }
  for (size_t idx = 0; idx < toOperations.size(); ++idx) {
    lastIndexInTo[toOperations[idx]->type] = idx;
  }

  while (i < fromOperations.size() && j < toOperations.size()) {
    const auto &fromOperation = fromOperations[i];
    const auto &toOperation = toOperations[j];

    // Case 1: Types match directly
    if (fromOperation->type == toOperation->type) {
      fromOperationsResult.emplace_back(fromOperation);
      toOperationsResult.emplace_back(toOperation);
      i++;
      j++;
    } else {
      // Case 3: Use default values if no conversion possible
      bool toExistsLaterInFrom = lastIndexInFrom.count(toOperation->type) && lastIndexInFrom[toOperation->type] > i;
      bool fromExistsLaterInTo = lastIndexInTo.count(fromOperation->type) && lastIndexInTo[fromOperation->type] > j;

      if (!fromExistsLaterInTo) {
        // If fromOperation does not exist later in toOperations, we can
        // interpolate it to the default value
        fromOperationsResult.emplace_back(fromOperation);
        toOperationsResult.emplace_back(getDefaultOperationOfType(fromOperation->type));
        i++;
      } else {
        // If toOperation does not exist later in fromOperations, we can
        // interpolate it from the default value
        fromOperationsResult.emplace_back(getDefaultOperationOfType(toOperation->type));
        toOperationsResult.emplace_back(toOperation);
        j++;
      }
    }
  }

  // Convert all operations to matrices if matrix interpolation is required
  // Add remaining operations with default values
  for (; i < fromOperations.size(); ++i) {
    fromOperationsResult.emplace_back(fromOperations[i]);
    toOperationsResult.emplace_back(getDefaultOperationOfType(fromOperations[i]->type));
  }
  for (; j < toOperations.size(); ++j) {
    fromOperationsResult.emplace_back(getDefaultOperationOfType(toOperations[j]->type));
    toOperationsResult.emplace_back(toOperations[j]);
  }

  return std::make_pair(fromOperationsResult, toOperationsResult);
}

size_t FilterStyleInterpolator::getIndexOfCurrentKeyframe(
    const std::shared_ptr<KeyframeProgressProvider> &progressProvider) const {
  const auto progress = progressProvider->getGlobalProgress();

  const auto it = std::lower_bound(
      keyframes_.begin(),
      keyframes_.end(),
      progress,
      [](const std::shared_ptr<FilterKeyframe> &keyframe, double progress) {
        return keyframe->toOffset < progress;
      });

  // If we're at the end, return the last valid keyframe index
  if (it == keyframes_.end()) {
    return keyframes_.size() - 1;
  }

  return std::distance(keyframes_.begin(), it);
}

FilterOperations FilterStyleInterpolator::getFallbackValue(
    const std::shared_ptr<const ShadowNode> &shadowNode) const {
  const auto &styleValue = getStyleValue(shadowNode);
  return parseFilterOperations(styleValue).value_or(FilterOperations{});
}

std::shared_ptr<FilterOperation> FilterStyleInterpolator::getDefaultOperationOfType(
    const FilterOp type) const {
  return interpolators_->at(type)->getDefaultOperation();
}

folly::dynamic FilterStyleInterpolator::interpolateOperations(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const double keyframeProgress,
    const FilterOperations &fromOperations,
    const FilterOperations &toOperations) const {
  FilterOperations result;
  result.reserve(fromOperations.size());

  const auto filterUpdateContext = FilterInterpolationContext{shadowNode, viewStylesRepository_, interpolators_};

  for (size_t i = 0; i < fromOperations.size(); ++i) {
    const auto &fromOperation = fromOperations[i];
    const auto &toOperation = toOperations[i];

    // fromOperation and toOperation have the same type
    const auto &interpolator = interpolators_->at(fromOperation->type);
    result.emplace_back(
        interpolator->interpolate(keyframeProgress, fromOperation, toOperation, filterUpdateContext));
  }

  if (result.empty()) {
    return folly::dynamic();
  }

  return convertOperationsToDynamic(result);
}

folly::dynamic FilterStyleInterpolator::convertOperationsToDynamic(const FilterOperations &operations) {
  auto result = folly::dynamic::array();
  result.reserve(operations.size());

  for (const auto &operation : operations) {
    result.push_back(operation->toDynamic());
  }

  return result;
}

} // namespace reanimated::css
