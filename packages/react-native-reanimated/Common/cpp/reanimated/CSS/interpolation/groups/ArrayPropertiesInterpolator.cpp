#include <reanimated/CSS/interpolation/groups/ArrayPropertiesInterpolator.h>

#include <jsi/JSIDynamic.h>

#include <algorithm>
#include <memory>

namespace reanimated::css {

namespace {

// Passes the parent's eased progress through unchanged; only the segment
// lookup is clamped, so an overshooting easing cannot underflow it.
class ArraySegmentProgressProvider final : public KeyframeProgressProvider {
 public:
  explicit ArraySegmentProgressProvider(double progress) : progress_(progress) {}

  double getGlobalProgress() const override {
    return std::clamp(progress_, 0.0, 1.0);
  }

  double getKeyframeProgress(double, double) const override {
    return progress_;
  }

 private:
  const double progress_;
};

} // namespace

ArrayPropertiesInterpolator::ArrayPropertiesInterpolator(
    const InterpolatorFactoriesArray &factories,
    const PropertyPath &propertyPath,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : GroupPropertiesInterpolator(propertyPath, viewStylesRepository), factories_(factories) {}

folly::dynamic ArrayPropertiesInterpolator::getDefaultValue() const {
  auto result = folly::dynamic::array();
  // One factory is a variable-length list, several are a tuple.
  if (factories_.size() > 1) {
    for (const auto &factory : factories_) {
      result.push_back(factory->getDefaultValue().toDynamic());
    }
  }
  return result;
}

folly::dynamic ArrayPropertiesInterpolator::getStyleValue(const std::shared_ptr<const ShadowNode> &shadowNode) const {
  return PropertyInterpolator::getStyleValue(shadowNode);
}

folly::dynamic ArrayPropertiesInterpolator::getResetStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const {
  const auto value = getStyleValue(shadowNode);
  return value.isArray() ? value : getDefaultValue();
}

folly::dynamic ArrayPropertiesInterpolator::getFirstKeyframeValue() const {
  return keyframes_.front().second;
}

folly::dynamic ArrayPropertiesInterpolator::getLastKeyframeValue() const {
  return keyframes_.back().second;
}

void ArrayPropertiesInterpolator::updateKeyframes(jsi::Runtime &rt, const jsi::Value &keyframes) {
  keyframes_.clear();
  viewSegment_.reset();
  segment_ = nullptr;
  for (const auto &[offset, value] : parseJSIKeyframes(rt, keyframes)) {
    keyframes_.emplace_back(offset, value.isUndefined() ? folly::dynamic() : jsi::dynamicFromValue(rt, value));
  }
  const auto count = keyframes_.size();
  keyframeSegments_.assign(count, nullptr);
  for (size_t i = 1; i < count; ++i) {
    const auto &from = keyframes_[i - 1].second;
    const auto &to = keyframes_[i].second;
    if (!from.isNull() && !to.isNull()) {
      keyframeSegments_[i] = std::make_shared<Segment>();
      prepareSegment(*keyframeSegments_[i], from, to);
    }
  }
  // Parse values next to omitted endpoints too, so invalid input fails on registration.
  Segment scratch;
  for (size_t i = 0; i < count; ++i) {
    const auto &value = keyframes_[i].second;
    const bool prepared = keyframeSegments_[i] || (i + 1 < count && keyframeSegments_[i + 1]);
    if (!value.isNull() && !prepared) {
      prepareSegment(scratch, value, value);
    }
  }
}

bool ArrayPropertiesInterpolator::updateKeyframes(
    jsi::Runtime &rt,
    const jsi::Value &fromValue,
    const jsi::Value &toValue) {
  return updateKeyframes(
      fromValue.isUndefined() ? folly::dynamic() : jsi::dynamicFromValue(rt, fromValue),
      toValue.isUndefined() ? folly::dynamic() : jsi::dynamicFromValue(rt, toValue));
}

bool ArrayPropertiesInterpolator::updateKeyframes(const folly::dynamic &fromValue, const folly::dynamic &toValue) {
  const auto from = fromValue.isNull() ? getDefaultValue() : fromValue;
  const auto to = toValue.isNull() ? getDefaultValue() : toValue;
  if (!viewSegment_) {
    viewSegment_ = std::make_shared<Segment>();
  }
  prepareSegment(*viewSegment_, from, to);
  segment_ = viewSegment_.get();
  const auto normalizedFrom = getEndpointValue(true);
  const auto normalizedTo = getEndpointValue(false);
  const bool reversed = reversingAdjustedStartValue_ && normalizedTo == *reversingAdjustedStartValue_;
  reversingAdjustedStartValue_ = reversed && !keyframes_.empty() ? keyframes_.back().second : normalizedFrom;
  keyframes_ = {{0, normalizedFrom}, {1, normalizedTo}};
  viewSegment_->values = std::make_pair(normalizedFrom, normalizedTo);
  keyframeSegments_ = {nullptr, viewSegment_};
  return reversed;
}

void ArrayPropertiesInterpolator::prepareSegment(Segment &segment, const folly::dynamic &from, const folly::dynamic &to)
    const {
  if (!from.isArray() || !to.isArray()) {
    throw std::invalid_argument("[Reanimated] Expected array values for " + getPropertyPathString());
  }
  auto &interpolators = segment.interpolators;
  const auto count = std::max(from.size(), to.size());
  interpolators.resize(std::min(count, interpolators.size()));
  while (interpolators.size() < count) {
    interpolators.push_back(
        createPropertyInterpolator(interpolators.size(), propertyPath_, factories_, viewStylesRepository_));
  }
  for (size_t i = 0; i < count; ++i) {
    // A missing element interpolates to the child default, not to the view's own element.
    interpolators[i]->updateKeyframes(
        i < from.size() ? from[i] : folly::dynamic(), i < to.size() ? to[i] : folly::dynamic());
  }
  segment.values = std::make_pair(from, to);
}

folly::dynamic ArrayPropertiesInterpolator::getEndpointValue(bool from) const {
  const auto count = from ? segment_->values.first.size() : segment_->values.second.size();
  auto result = folly::dynamic::array();
  for (size_t i = 0; i < count; ++i) {
    const auto &interpolator = segment_->interpolators[i];
    result.push_back(from ? interpolator->getFirstKeyframeValue() : interpolator->getLastKeyframeValue());
  }
  return result;
}

folly::dynamic ArrayPropertiesInterpolator::interpolate(
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
    double fallbackInterpolateThreshold) const {
  const auto it = std::upper_bound(
      keyframes_.begin(),
      keyframes_.end(),
      progressProvider->getGlobalProgress(),
      [](double progress, const auto &keyframe) { return progress < keyframe.first; });
  const auto toIndex = std::clamp<size_t>(std::distance(keyframes_.begin(), it), 1, keyframes_.size() - 1);
  const auto &[fromOffset, fromValue] = keyframes_[toIndex - 1];
  const auto &[toOffset, toValue] = keyframes_[toIndex];
  if (const auto &prepared = keyframeSegments_[toIndex]) {
    segment_ = prepared.get();
  } else {
    const auto underlying = getResetStyle(shadowNode);
    const auto &from = fromValue.isNull() ? underlying : fromValue;
    const auto &to = toValue.isNull() ? underlying : toValue;
    if (!viewSegment_) {
      viewSegment_ = std::make_shared<Segment>();
    }
    if (viewSegment_->values.first != from || viewSegment_->values.second != to) {
      prepareSegment(*viewSegment_, from, to);
    }
    segment_ = viewSegment_.get();
  }
  const auto progress = progressProvider->getKeyframeProgress(fromOffset, toOffset);
  if (progress == 0 || progress == 1) {
    return getEndpointValue(progress == 0);
  }
  return GroupPropertiesInterpolator::interpolate(
      shadowNode, std::make_shared<ArraySegmentProgressProvider>(progress), fallbackInterpolateThreshold);
}

folly::dynamic ArrayPropertiesInterpolator::mapInterpolators(
    const std::function<folly::dynamic(PropertyInterpolator &)> &callback) const {
  auto result = folly::dynamic::array();
  for (const auto &interpolator : segment_->interpolators) {
    result.push_back(callback(*interpolator));
  }
  return result;
}

} // namespace reanimated::css
