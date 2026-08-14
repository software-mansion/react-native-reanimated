#pragma once

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>
#include <reanimated/CSS/interpolation/configs.h>
#include <reanimated/CSS/interpolation/filters/FilterOperation.h>
#include <reanimated/CSS/interpolation/filters/FilterOperationInterpolator.h>
#include <reanimated/CSS/interpolation/groups/ArrayPropertiesInterpolator.h>
#include <reanimated/CSS/interpolation/groups/RecordPropertiesInterpolator.h>
#include <reanimated/CSS/interpolation/operations/StyleOperationInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperationInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/TransformsStyleInterpolator.h>
#include <reanimated/CSS/interpolation/values/RelativeValueInterpolator.h>
#include <reanimated/CSS/interpolation/values/SimpleValueInterpolator.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <utility>

namespace reanimated::css {

// Template class implementations
template <typename... AllowedTypes>
class SimpleValueInterpolatorFactory : public PropertyInterpolatorFactory {
 public:
  template <typename TValue>
  explicit SimpleValueInterpolatorFactory(const TValue &defaultValue)
      : PropertyInterpolatorFactory(), defaultValue_(defaultValue) {}

  bool isDiscreteProperty() const override {
    // The property is considered discrete if all of the allowed types are
    // discrete
    return (Discrete<AllowedTypes> && ...);
  }

  const CSSValue &getDefaultValue() const override {
    return defaultValue_;
  }

  std::shared_ptr<PropertyInterpolator> create(
      const PropertyPath &propertyPath,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const override {
    return std::make_shared<SimpleValueInterpolator<AllowedTypes...>>(
        propertyPath, defaultValue_, viewStylesRepository);
  }

 private:
  const CSSValueVariant<AllowedTypes...> defaultValue_;
};

template <typename... AllowedTypes>
class RelativeValueInterpolatorFactory : public PropertyInterpolatorFactory {
 public:
  template <typename TValue>
  explicit RelativeValueInterpolatorFactory(const TValue &defaultValue, RelativeValueInterpolatorConfig config)
      : PropertyInterpolatorFactory(), defaultValue_(defaultValue), config_(std::move(config)) {}

  const CSSValue &getDefaultValue() const override {
    return defaultValue_;
  }

  std::shared_ptr<PropertyInterpolator> create(
      const PropertyPath &propertyPath,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const override {
    return std::make_shared<RelativeValueInterpolator<AllowedTypes...>>(
        propertyPath, defaultValue_, viewStylesRepository, config_);
  }

 private:
  const CSSValueVariant<AllowedTypes...> defaultValue_;
  RelativeValueInterpolatorConfig config_;
};

/**
 * Helper function to create a concrete CSSValue from defaultValue
 */
template <typename... AllowedTypes>
CSSValueVariant<AllowedTypes...> createCSSValue(const auto &defaultValue) {
  using ValueType = decltype(defaultValue);
  CSSValueVariant<AllowedTypes...> result;

  auto tryOne = [&]<typename TCSSValue>() -> bool {
    if constexpr (std::is_constructible_v<TCSSValue, ValueType>) {
      if constexpr (ValueConstructibleCSSValue<TCSSValue, ValueType>) {
        // For construction from a non-jsi::Value, we perform a runtime
        // canConstruct check only if the type has a canConstruct method.
        // (this is needed e.g. when different CSS value types can be
        // constructed from the same value type, like CSSLength and CSSKeyword)
        if (!TCSSValue::canConstruct(defaultValue)) {
          return false;
        }
      }
      result = CSSValueVariant<AllowedTypes...>(std::variant<AllowedTypes...>(TCSSValue(defaultValue)));
      return true;
    }
    return false;
  };

  // Try constructing with each allowed type until one succeeds
  if (!(tryOne.template operator()<AllowedTypes>() || ...)) {
    throw std::runtime_error("[Reanimated] No compatible type found for construction from defaultValue");
  }

  return result;
}

/**
 * Value interpolator factories
 */
template <typename... AllowedTypes>
auto value(const auto &defaultValue) -> std::enable_if_t<
    (std::is_constructible_v<AllowedTypes, decltype(defaultValue)> || ...),
    std::shared_ptr<PropertyInterpolatorFactory>> {
  static_assert(
      (InterpolatesWith<AllowedTypes, ValueInterpolationContext> && ...),
      "Value types that resolve against a relative property (e.g. CSSLength) need a "
      "RelativeValueInterpolatorConfig - use the value(defaultValue, {RelativeTo::..., \"...\"}) overload instead");
  // Create a concrete CSSValue from the defaultValue
  auto cssValue = createCSSValue<AllowedTypes...>(defaultValue);
  return std::make_shared<SimpleValueInterpolatorFactory<AllowedTypes...>>(std::move(cssValue));
}

template <typename... AllowedTypes>
auto value(const auto &defaultValue, RelativeValueInterpolatorConfig config) -> std::enable_if_t<
    (std::is_constructible_v<AllowedTypes, decltype(defaultValue)> || ...),
    std::shared_ptr<PropertyInterpolatorFactory>> {
  static_assert(
      (InterpolatesWith<AllowedTypes, RelativeValueInterpolationContext> && ...) && (Resolvable<AllowedTypes> || ...),
      "This overload is for value types that resolve against a relative property (e.g. CSSLength). Types that "
      "resolve against something else, or that need no resolution at all, use the value(defaultValue) overload.");
  // Create a concrete CSSValue from the defaultValue
  auto cssValue = createCSSValue<AllowedTypes...>(defaultValue);
  return std::make_shared<RelativeValueInterpolatorFactory<AllowedTypes...>>(std::move(cssValue), std::move(config));
}

/**
 * Transform operation interpolator factories
 */
template <typename TOperation>
auto transformOp(const auto &defaultValue) -> std::enable_if_t<
    std::is_base_of_v<TransformOperation, TOperation> && std::is_constructible_v<TOperation, decltype(defaultValue)>,
    std::shared_ptr<StyleOperationInterpolator>> {
  return std::make_shared<TransformOperationInterpolator<TOperation>>(std::make_shared<TOperation>(defaultValue));
}

template <typename TOperation>
auto transformOp(const auto &defaultValue, RelativeValueInterpolatorConfig config) -> std::enable_if_t<
    std::is_base_of_v<TransformOperation, TOperation> && std::is_constructible_v<TOperation, decltype(defaultValue)> &&
        ResolvableOp<TOperation>,
    std::shared_ptr<StyleOperationInterpolator>> {
  return std::make_shared<TransformOperationInterpolator<TOperation>>(
      std::make_shared<TOperation>(defaultValue), std::move(config));
}

/**
 * Filter operation interpolator factories
 */
template <typename TOperation>
auto filterOp(const auto &defaultValue) -> std::enable_if_t<
    std::is_base_of_v<FilterOperation, TOperation> && std::is_constructible_v<TOperation, decltype(defaultValue)>,
    std::shared_ptr<StyleOperationInterpolator>> {
  return std::make_shared<FilterOperationInterpolator<TOperation>>(std::make_shared<TOperation>(defaultValue));
}

template <typename TOperation>
auto filterOp(const auto &defaultValue, RelativeValueInterpolatorConfig config) -> std::enable_if_t<
    std::is_base_of_v<FilterOperation, TOperation> && std::is_constructible_v<TOperation, decltype(defaultValue)> &&
        ResolvableOp<TOperation>,
    std::shared_ptr<StyleOperationInterpolator>> {
  return std::make_shared<FilterOperationInterpolator<TOperation>>(
      std::make_shared<TOperation>(defaultValue), std::move(config));
}

/**
 * Record property interpolator factory
 */
std::shared_ptr<PropertyInterpolatorFactory> record(const InterpolatorFactoriesRecord &factories);

/**
 * Array property interpolator factory
 */
std::shared_ptr<PropertyInterpolatorFactory> array(const InterpolatorFactoriesArray &factories);

/**
 * Transform interpolators
 */
std::shared_ptr<PropertyInterpolatorFactory> transforms(
    const std::unordered_map<std::string, std::shared_ptr<StyleOperationInterpolator>> &interpolators);

/**
 * Filter interpolators
 */
std::shared_ptr<PropertyInterpolatorFactory> filters(
    const std::unordered_map<std::string, std::shared_ptr<StyleOperationInterpolator>> &interpolators);

} // namespace reanimated::css
