#pragma once

#include <reanimated/CSS/common/values/CSSValueVariant.h>
#include <reanimated/CSS/interpolation/PropertyInterpolator.h>
#include <reanimated/CSS/utils/keyframes.h>

#include <memory>
#include <optional>
#include <vector>

namespace reanimated::css {

struct ValueKeyframe {
  double offset;
  std::optional<std::shared_ptr<CSSValue>> value;
};

/**
 * Base class for CSS value interpolators that provides common functionality
 * for interpolating CSS values during animations. This class should be extended
 * by concrete implementations for specific CSS value types to provide
 * type-specific interpolation logic.
 */
class ValueInterpolator : public PropertyInterpolator {
 public:
  explicit ValueInterpolator(
      const PropertyPath &propertyPath,
      const std::shared_ptr<CSSValue> &defaultValue,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository);
  virtual ~ValueInterpolator() = default;

  folly::dynamic getStyleValue(
      const std::shared_ptr<const ShadowNode> &shadowNode) const override;
  folly::dynamic getResetStyle(
      const std::shared_ptr<const ShadowNode> &shadowNode) const override;
  folly::dynamic getFirstKeyframeValue() const override;
  folly::dynamic getLastKeyframeValue() const override;
  bool equalsReversingAdjustedStartValue(
      const folly::dynamic &propertyValue) const override;

  void updateKeyframes(jsi::Runtime &rt, const jsi::Value &keyframes) override;
  void updateKeyframesFromStyleChange(
      const folly::dynamic &oldStyleValue,
      const folly::dynamic &newStyleValue,
      const folly::dynamic &lastUpdateValue) override;

  folly::dynamic interpolate(
      const std::shared_ptr<const ShadowNode> &shadowNode,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider)
      const override;

 protected:
  std::vector<ValueKeyframe> keyframes_;
  std::shared_ptr<CSSValue> defaultStyleValue_;
  folly::dynamic defaultStyleValueDynamic_;
  folly::dynamic reversingAdjustedStartValue_;

  virtual std::shared_ptr<CSSValue> createValue(
      jsi::Runtime &rt,
      const jsi::Value &value) const = 0;
  virtual std::shared_ptr<CSSValue> createValue(
      const folly::dynamic &value) const = 0;
  virtual folly::dynamic interpolateValue(
      double progress,
      const std::shared_ptr<CSSValue> &fromValue,
      const std::shared_ptr<CSSValue> &toValue,
      const ValueInterpolatorUpdateContext &context) const = 0;

 private:
  folly::dynamic convertOptionalToDynamic(
      const std::optional<std::shared_ptr<CSSValue>> &value) const;
  std::shared_ptr<CSSValue> getFallbackValue(
      const std::shared_ptr<const ShadowNode> &shadowNode) const;
  size_t getToKeyframeIndex(
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider) const;
};

} // namespace reanimated::css
