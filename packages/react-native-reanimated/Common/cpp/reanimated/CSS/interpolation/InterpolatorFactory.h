#pragma once

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>

#include <reanimated/CSS/interpolation/groups/ArrayPropertiesInterpolator.h>
#include <reanimated/CSS/interpolation/groups/RecordPropertiesInterpolator.h>

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
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      const override {
    return std::make_shared<SimpleValueInterpolator<AllowedTypes...>>(
        propertyPath, defaultValue_, viewStylesRepository);
  }

 private:
  const CSSValueVariant<AllowedTypes...> defaultValue_;
};

template <typename... AllowedTypes>
class ResolvableValueInterpolatorFactory : public PropertyInterpolatorFactory {
 public:
  template <typename TValue>
  explicit ResolvableValueInterpolatorFactory(
      RelativeTo relativeTo,
      const std::string &relativeProperty,
      const TValue &defaultValue)
      : PropertyInterpolatorFactory(),
        relativeTo_(relativeTo),
        relativeProperty_(relativeProperty),
        defaultValue_(defaultValue) {}

  const CSSValue &getDefaultValue() const override {
    return defaultValue_;
  }

  std::shared_ptr<PropertyInterpolator> create(
      const PropertyPath &propertyPath,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      const override {
    return std::make_shared<ResolvableValueInterpolator<AllowedTypes...>>(
        propertyPath,
        defaultValue_,
        viewStylesRepository,
        relativeTo_,
        relativeProperty_);
  }

 private:
  const RelativeTo relativeTo_;
  const std::string relativeProperty_;
  const CSSValueVariant<AllowedTypes...> defaultValue_;
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
      result = CSSValueVariant<AllowedTypes...>(
          std::variant<AllowedTypes...>(TCSSValue(defaultValue)));
      return true;
    }
    return false;
  };

  // Try constructing with each allowed type until one succeeds
  if (!(tryOne.template operator()<AllowedTypes>() || ...)) {
    throw std::runtime_error(
        "[Reanimated] No compatible type found for construction from defaultValue");
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
  // Create a concrete CSSValue from the defaultValue
  auto cssValue = createCSSValue<AllowedTypes...>(defaultValue);
  return std::make_shared<SimpleValueInterpolatorFactory<AllowedTypes...>>(
      std::move(cssValue));
}

template <typename... AllowedTypes>
auto value(
    RelativeTo relativeTo,
    const std::string &relativeProperty,
    const auto &defaultValue)
    -> std::enable_if_t<
        (std::is_constructible_v<AllowedTypes, decltype(defaultValue)> || ...),
        std::shared_ptr<PropertyInterpolatorFactory>> {
  // Create a concrete CSSValue from the defaultValue
  auto cssValue = createCSSValue<AllowedTypes...>(defaultValue);
  return std::make_shared<ResolvableValueInterpolatorFactory<AllowedTypes...>>(
      relativeTo, relativeProperty, std::move(cssValue));
}

/**
 * Transform operation interpolator factories
 */
template <typename TOperation>
auto transformOp(const auto &defaultValue) -> std::enable_if_t<
    std::is_base_of_v<TransformOperation, TOperation> &&
        std::is_constructible_v<TOperation, decltype(defaultValue)>,
    std::shared_ptr<TransformInterpolator>> {
  return std::make_shared<TransformOperationInterpolator<TOperation>>(
      std::make_shared<TOperation>(defaultValue));
}

template <typename TOperation>
auto transformOp(
    RelativeTo relativeTo,
    const std::string &relativeProperty,
    const auto &defaultValue)
    -> std::enable_if_t<
        std::is_base_of_v<TransformOperation, TOperation> &&
            std::is_constructible_v<TOperation, decltype(defaultValue)> &&
            ResolvableOperation<TOperation>,
        std::shared_ptr<TransformInterpolator>> {
  return std::make_shared<TransformOperationInterpolator<TOperation>>(
      std::make_shared<TOperation>(defaultValue), relativeTo, relativeProperty);
}

/**
 * Record property interpolator factory
 */
std::shared_ptr<PropertyInterpolatorFactory> record(
    const InterpolatorFactoriesRecord &factories);

/**
 * Array property interpolator factory
 */
std::shared_ptr<PropertyInterpolatorFactory> array(
    const InterpolatorFactoriesArray &factories);

/**
 * Transform interpolators
 */
std::shared_ptr<PropertyInterpolatorFactory> transforms(
    const std::unordered_map<
        std::string,
        std::shared_ptr<TransformInterpolator>> &interpolators);

} // namespace reanimated::css
