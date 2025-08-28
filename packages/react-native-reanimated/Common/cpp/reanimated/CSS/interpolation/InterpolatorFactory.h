#pragma once

#include <reanimated/CSS/interpolation/PropertyInterpolator.h>
#include <reanimated/CSS/interpolation/configs.h>
#include <reanimated/CSS/interpolation/groups/ArrayPropertiesInterpolator.h>
#include <reanimated/CSS/interpolation/groups/RecordPropertiesInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>
#include <reanimated/CSS/interpolation/transforms/TransformOperationInterpolator.h>
#include <reanimated/CSS/interpolation/transforms/TransformsStyleInterpolator.h>
#include <reanimated/CSS/interpolation/values/ResolvableValueInterpolator.h>
#include <reanimated/CSS/interpolation/values/ValueInterpolator.h>

#include <memory>
#include <string>
#include <unordered_map>

namespace reanimated::css {

// Template class implementations
template <typename... AllowedTypes>
class ValueInterpolatorFactory : public PropertyInterpolatorFactory {
 public:
  template <typename TValue>
  explicit ValueInterpolatorFactory(const TValue &defaultValue)
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
    return std::make_shared<ValueInterpolator<AllowedTypes...>>(
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
      const TValue &defaultValue,
      ResolvableValueInterpolatorConfig config)
      : PropertyInterpolatorFactory(),
        defaultValue_(defaultValue),
        config_(config) {}

  const CSSValue &getDefaultValue() const override {
    return defaultValue_;
  }

  std::shared_ptr<PropertyInterpolator> create(
      const PropertyPath &propertyPath,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      const override {
    return std::make_shared<ResolvableValueInterpolator<AllowedTypes...>>(
        propertyPath, defaultValue_, viewStylesRepository, config_);
  }

 private:
  const CSSValueVariant<AllowedTypes...> defaultValue_;
  ResolvableValueInterpolatorConfig config_;
};

/**
 * Value interpolator factories
 */
template <typename... AllowedTypes>
auto value(const auto &defaultValue) -> std::enable_if_t<
    (std::is_constructible_v<AllowedTypes, decltype(defaultValue)> || ...),
    std::shared_ptr<PropertyInterpolatorFactory>> {
  return std::make_shared<ValueInterpolatorFactory<AllowedTypes...>>(
      CSSValueVariant<AllowedTypes...>(defaultValue));
}

template <typename... AllowedTypes>
auto value(const auto &defaultValue, ResolvableValueInterpolatorConfig config)
    -> std::enable_if_t<
        (std::is_constructible_v<AllowedTypes, decltype(defaultValue)> || ...),
        std::shared_ptr<PropertyInterpolatorFactory>> {
  return std::make_shared<ResolvableValueInterpolatorFactory<AllowedTypes...>>(
      CSSValueVariant<AllowedTypes...>(defaultValue), std::move(config));
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
    const auto &defaultValue,
    ResolvableValueInterpolatorConfig config)
    -> std::enable_if_t<
        std::is_base_of_v<TransformOperation, TOperation> &&
            std::is_constructible_v<TOperation, decltype(defaultValue)> &&
            ResolvableOperation<TOperation>,
        std::shared_ptr<TransformInterpolator>> {
  return std::make_shared<TransformOperationInterpolator<TOperation>>(
      std::make_shared<TOperation>(defaultValue), std::move(config));
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
