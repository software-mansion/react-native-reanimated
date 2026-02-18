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
#include <reanimated/CSS/interpolation/values/ResolvableValueInterpolator.h>
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
  explicit SimpleValueInterpolatorFactory(
      const TValue &defaultValue,
      std::function<void(const std::shared_ptr<AnimatedPropsBuilder> &, const CSSValueVariant<AllowedTypes...> &)>
          addToPropsBuilder)
      : PropertyInterpolatorFactory(), defaultValue_(defaultValue), addToPropsBuilder_(addToPropsBuilder) {}

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
        propertyPath, defaultValue_, viewStylesRepository, addToPropsBuilder_);
  }

 private:
  const CSSValueVariant<AllowedTypes...> defaultValue_;
  std::function<void(const std::shared_ptr<AnimatedPropsBuilder> &, const CSSValueVariant<AllowedTypes...> &)>
      addToPropsBuilder_;
};

template <typename... AllowedTypes>
class ResolvableValueInterpolatorFactory : public PropertyInterpolatorFactory {
 public:
  template <typename TValue>
  explicit ResolvableValueInterpolatorFactory(
      const TValue &defaultValue,
      ResolvableValueInterpolatorConfig config,
      std::function<void(const std::shared_ptr<AnimatedPropsBuilder> &, const CSSValueVariant<AllowedTypes...> &)>
          addToPropsBuilder)
      : PropertyInterpolatorFactory(),
        defaultValue_(defaultValue),
        config_(std::move(config)),
        addToPropsBuilder_(addToPropsBuilder) {}

  const CSSValue &getDefaultValue() const override {
    return defaultValue_;
  }

  std::shared_ptr<PropertyInterpolator> create(
      const PropertyPath &propertyPath,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const override {
    return std::make_shared<ResolvableValueInterpolator<AllowedTypes...>>(
        propertyPath, defaultValue_, viewStylesRepository, config_, addToPropsBuilder_);
  }

 private:
  const CSSValueVariant<AllowedTypes...> defaultValue_;
  ResolvableValueInterpolatorConfig config_;
  std::function<void(const std::shared_ptr<AnimatedPropsBuilder> &, const CSSValueVariant<AllowedTypes...> &)>
      addToPropsBuilder_;
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
auto value(
    const auto &defaultValue,
    std::function<void(const std::shared_ptr<AnimatedPropsBuilder> &, const CSSValueVariant<AllowedTypes...> &)>
        addToPropsBuilder)
    -> std::enable_if_t<
        (std::is_constructible_v<AllowedTypes, decltype(defaultValue)> || ...),
        std::shared_ptr<PropertyInterpolatorFactory>> {
  // Create a concrete CSSValue from the defaultValue
  auto cssValue = createCSSValue<AllowedTypes...>(defaultValue);
  return std::make_shared<SimpleValueInterpolatorFactory<AllowedTypes...>>(std::move(cssValue), addToPropsBuilder);
}

template <typename... AllowedTypes>
auto value(
    const auto &defaultValue,
    ResolvableValueInterpolatorConfig config,
    std::function<void(const std::shared_ptr<AnimatedPropsBuilder> &, const CSSValueVariant<AllowedTypes...> &)>
        addToPropsBuilder)
    -> std::enable_if_t<
        (std::is_constructible_v<AllowedTypes, decltype(defaultValue)> || ...),
        std::shared_ptr<PropertyInterpolatorFactory>> {
  // Create a concrete CSSValue from the defaultValue
  auto cssValue = createCSSValue<AllowedTypes...>(defaultValue);
  return std::make_shared<ResolvableValueInterpolatorFactory<AllowedTypes...>>(
      std::move(cssValue), std::move(config), addToPropsBuilder);
}

/**
 * Transform operation interpolator factories
 */
template <typename TOperation>
auto transformOp(
    const auto &defaultValue,
    std::function<void(const std::shared_ptr<AnimatedPropsBuilder> &, TOperation &)> addToPropsBuilder)
    -> std::enable_if_t<
        std::is_base_of_v<TransformOperation, TOperation> &&
            std::is_constructible_v<TOperation, decltype(defaultValue)>,
        std::shared_ptr<StyleOperationInterpolator>> {
  return std::make_shared<TransformOperationInterpolator<TOperation>>(
      std::make_shared<TOperation>(defaultValue), addToPropsBuilder);
}

template <typename TOperation>
auto transformOp(
    const auto &defaultValue,
    ResolvableValueInterpolatorConfig config,
    std::function<void(const std::shared_ptr<AnimatedPropsBuilder> &, TOperation &)> addToPropsBuilder)
    -> std::enable_if_t<
        std::is_base_of_v<TransformOperation, TOperation> &&
            std::is_constructible_v<TOperation, decltype(defaultValue)> && ResolvableOp<TOperation>,
        std::shared_ptr<StyleOperationInterpolator>> {
  return std::make_shared<TransformOperationInterpolator<TOperation>>(
      std::make_shared<TOperation>(defaultValue), std::move(config), addToPropsBuilder);
}

/**
 * Filter operation interpolator factories
 */
template <typename TOperation>
auto filterOp(
    const auto &defaultValue,
    std::function<void(const std::shared_ptr<AnimatedPropsBuilder> &, TOperation &)> addToPropsBuilder)
    -> std::enable_if_t<
        std::is_base_of_v<FilterOperation, TOperation> && std::is_constructible_v<TOperation, decltype(defaultValue)>,
        std::shared_ptr<StyleOperationInterpolator>> {
  return std::make_shared<FilterOperationInterpolator<TOperation>>(
      std::make_shared<TOperation>(defaultValue), addToPropsBuilder);
}

template <typename TOperation>
auto filterOp(const auto &defaultValue, ResolvableValueInterpolatorConfig config) -> std::enable_if_t<
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
