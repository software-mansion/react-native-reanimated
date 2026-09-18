#pragma once

#include <reanimated/CSS/interpolation/groups/GroupPropertiesInterpolator.h>
#include <reanimated/CSS/utils/interpolators.h>

#include <memory>
#include <optional>
#include <utility>
#include <vector>

namespace reanimated::css {

class ArrayPropertiesInterpolator : public GroupPropertiesInterpolator {
 public:
  ArrayPropertiesInterpolator(
      const InterpolatorFactoriesArray &factories,
      const PropertyPath &propertyPath,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);
  virtual ~ArrayPropertiesInterpolator() = default;

  folly::dynamic getStyleValue(const std::shared_ptr<const ShadowNode> &shadowNode) const override;
  folly::dynamic getResetStyle(const std::shared_ptr<const ShadowNode> &shadowNode) const override;
  folly::dynamic getFirstKeyframeValue() const override;
  folly::dynamic getLastKeyframeValue() const override;

  void updateKeyframes(jsi::Runtime &rt, const jsi::Value &keyframes) override;
  bool updateKeyframes(jsi::Runtime &rt, const jsi::Value &fromValue, const jsi::Value &toValue) override;
  bool updateKeyframes(const folly::dynamic &fromValue, const folly::dynamic &toValue) override;

  folly::dynamic interpolate(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
      double fallbackInterpolateThreshold) const override;

 protected:
  folly::dynamic mapInterpolators(const std::function<folly::dynamic(PropertyInterpolator &)> &callback) const override;

 private:
  struct Segment {
    std::pair<folly::dynamic, folly::dynamic> values;
    PropertyInterpolatorsArray interpolators;
  };

  const InterpolatorFactoriesArray &factories_;
  // Null marks an omitted array endpoint; [] is an explicit empty value.
  std::vector<std::pair<double, folly::dynamic>> keyframes_;
  std::optional<folly::dynamic> reversingAdjustedStartValue_;
  // Indexed by the segment's end keyframe; null when an endpoint is omitted.
  std::vector<std::shared_ptr<Segment>> keyframeSegments_;
  mutable std::shared_ptr<Segment> viewSegment_;
  mutable Segment *segment_ = nullptr;

  folly::dynamic getDefaultValue() const;
  void prepareSegment(Segment &segment, const folly::dynamic &from, const folly::dynamic &to) const;
  folly::dynamic getEndpointValue(bool from) const;
};

} // namespace reanimated::css
