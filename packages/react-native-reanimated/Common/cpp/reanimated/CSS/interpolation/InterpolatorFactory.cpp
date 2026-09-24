#include <reanimated/CSS/interpolation/InterpolatorFactory.h>
#include <reanimated/CSS/interpolation/filters/FilterStyleInterpolator.h>

#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/common/values/CSSBoolean.h>
#include <reanimated/CSS/common/values/CSSColor.h>
#include <reanimated/CSS/common/values/CSSDiscreteArray.h>
#include <reanimated/CSS/common/values/CSSKeyword.h>
#include <reanimated/CSS/common/values/CSSLength.h>
#include <reanimated/CSS/common/values/CSSNumber.h>
#include <reanimated/CSS/common/values/complex/CSSBoxShadow.h>
#include <reanimated/CSS/svg/values/CSSLengthArray.h>
#include <reanimated/CSS/svg/values/SVGBrush.h>
#include <reanimated/CSS/svg/values/SVGPath.h>
#include <reanimated/CSS/svg/values/SVGStops.h>
#include <reanimated/CSS/svg/values/SVGStrokeDashArray.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <utility>

namespace reanimated::css {

// SimpleValueInterpolatorFactory<AllowedTypes...>

template <typename... AllowedTypes>
SimpleValueInterpolatorFactory<AllowedTypes...>::SimpleValueInterpolatorFactory(
    CSSValueVariant<AllowedTypes...> defaultValue)
    : PropertyInterpolatorFactory(), defaultValue_(std::move(defaultValue)) {}

template <typename... AllowedTypes>
bool SimpleValueInterpolatorFactory<AllowedTypes...>::isDiscreteProperty() const {
  // The property is considered discrete if all of the allowed types are discrete.
  return (Discrete<AllowedTypes> && ...);
}

template <typename... AllowedTypes>
const CSSValue &SimpleValueInterpolatorFactory<AllowedTypes...>::getDefaultValue() const {
  return defaultValue_;
}

template <typename... AllowedTypes>
std::shared_ptr<PropertyInterpolator> SimpleValueInterpolatorFactory<AllowedTypes...>::create(
    const PropertyPath &propertyPath,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const {
  return std::make_shared<SimpleValueInterpolator<AllowedTypes...>>(propertyPath, defaultValue_, viewStylesRepository);
}

// ResolvableValueInterpolatorFactory<AllowedTypes...>

template <typename... AllowedTypes>
ResolvableValueInterpolatorFactory<AllowedTypes...>::ResolvableValueInterpolatorFactory(
    CSSValueVariant<AllowedTypes...> defaultValue,
    ResolvableValueInterpolatorConfig config)
    : PropertyInterpolatorFactory(), defaultValue_(std::move(defaultValue)), config_(std::move(config)) {}

template <typename... AllowedTypes>
const CSSValue &ResolvableValueInterpolatorFactory<AllowedTypes...>::getDefaultValue() const {
  return defaultValue_;
}

template <typename... AllowedTypes>
std::shared_ptr<PropertyInterpolator> ResolvableValueInterpolatorFactory<AllowedTypes...>::create(
    const PropertyPath &propertyPath,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const {
  return std::make_shared<ResolvableValueInterpolator<AllowedTypes...>>(
      propertyPath, defaultValue_, viewStylesRepository, config_);
}

// Explicit instantiations — must match the type packs `value<...>()` is called
// with in InterpolatorRegistry.cpp. Resolvable packs (CSSLength-derived) use
// ResolvableValueInterpolatorFactory; the rest use SimpleValueInterpolatorFactory.

template class SimpleValueInterpolatorFactory<CSSAngle>;
template class SimpleValueInterpolatorFactory<CSSBoolean>;
template class SimpleValueInterpolatorFactory<CSSBoxShadow>;
template class SimpleValueInterpolatorFactory<CSSColor>;
template class SimpleValueInterpolatorFactory<CSSDiscreteArray<CSSKeyword>>;
template class SimpleValueInterpolatorFactory<CSSDisplay>;
template class SimpleValueInterpolatorFactory<CSSDouble>;
template class SimpleValueInterpolatorFactory<CSSDouble, CSSKeyword>;
template class SimpleValueInterpolatorFactory<CSSIndex>;
template class SimpleValueInterpolatorFactory<CSSInteger>;
template class SimpleValueInterpolatorFactory<CSSKeyword>;
template class SimpleValueInterpolatorFactory<SVGBrush>;
template class SimpleValueInterpolatorFactory<SVGPath>;
template class SimpleValueInterpolatorFactory<SVGStops>;

template class ResolvableValueInterpolatorFactory<CSSLength>;
template class ResolvableValueInterpolatorFactory<CSSLength, CSSKeyword>;
template class ResolvableValueInterpolatorFactory<CSSLengthArray>;
template class ResolvableValueInterpolatorFactory<SVGStrokeDashArray, CSSKeyword>;

class RecordInterpolatorFactory : public PropertyInterpolatorFactory {
 public:
  explicit RecordInterpolatorFactory(const InterpolatorFactoriesRecord &factories)
      : PropertyInterpolatorFactory(), factories_(factories) {}

  const CSSValue &getDefaultValue() const override {
    static EmptyObjectValue emptyObjectValue;
    return emptyObjectValue;
  }

  std::shared_ptr<PropertyInterpolator> create(
      const PropertyPath &propertyPath,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const override {
    return std::make_shared<RecordPropertiesInterpolator>(factories_, propertyPath, viewStylesRepository);
  }

 private:
  // Helper private type just for a default value
  struct EmptyObjectValue : public CSSValue {
    folly::dynamic toDynamic() const override {
      return folly::dynamic::object;
    }

    std::string toString() const override {
      return "{}";
    }

    bool operator==(const CSSValue &) const override {
      return false;
    }
  };

  const InterpolatorFactoriesRecord factories_;
};

class ArrayLikeInterpolatorFactory : public PropertyInterpolatorFactory {
 public:
  const CSSValue &getDefaultValue() const override {
    static EmptyArrayValue emptyArrayValue;
    return emptyArrayValue;
  }

 private:
  // Helper private type just for a default value
  struct EmptyArrayValue : public CSSValue {
    folly::dynamic toDynamic() const override {
      return folly::dynamic::array;
    }

    std::string toString() const override {
      return "[]";
    }

    bool operator==(const CSSValue &) const override {
      return false;
    }
  };
};

class ArrayInterpolatorFactory : public ArrayLikeInterpolatorFactory {
 public:
  explicit ArrayInterpolatorFactory(const InterpolatorFactoriesArray &factories)
      : ArrayLikeInterpolatorFactory(), factories_(factories) {}

  std::shared_ptr<PropertyInterpolator> create(
      const PropertyPath &propertyPath,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const override {
    return std::make_shared<ArrayPropertiesInterpolator>(factories_, propertyPath, viewStylesRepository);
  }

 private:
  const InterpolatorFactoriesArray factories_;
};

class FiltersInterpolatorFactory : public ArrayLikeInterpolatorFactory {
 public:
  explicit FiltersInterpolatorFactory(const std::shared_ptr<StyleOperationInterpolators> &interpolators)
      : ArrayLikeInterpolatorFactory(), interpolators_(interpolators) {}

  std::shared_ptr<PropertyInterpolator> create(
      const PropertyPath &propertyPath,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const override {
    return std::make_shared<FilterStyleInterpolator>(propertyPath, interpolators_, viewStylesRepository);
  }

 private:
  const std::shared_ptr<StyleOperationInterpolators> interpolators_;
};

class TransformsInterpolatorFactory : public PropertyInterpolatorFactory {
 public:
  explicit TransformsInterpolatorFactory(const std::shared_ptr<StyleOperationInterpolators> &interpolators)
      : PropertyInterpolatorFactory(), interpolators_(interpolators) {}

  const CSSValue &getDefaultValue() const override {
    static EmptyTransformsValue emptyTransformsValue;
    return emptyTransformsValue;
  }

  std::shared_ptr<PropertyInterpolator> create(
      const PropertyPath &propertyPath,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) const override {
    return std::make_shared<TransformsStyleInterpolator>(propertyPath, interpolators_, viewStylesRepository);
  }

 private:
  static TransformMatrix2D &getIdentityMatrix() {
    static TransformMatrix2D identityMatrix = TransformMatrix2D();
    return identityMatrix;
  }

  // Helper private type just for a default value
  struct EmptyTransformsValue : public CSSValue {
    folly::dynamic toDynamic() const override {
      return getIdentityMatrix().toDynamic();
    }

    std::string toString() const override {
      return getIdentityMatrix().toString();
    }

    bool operator==(const CSSValue &) const override {
      return false;
    }
  };

  const std::shared_ptr<StyleOperationInterpolators> interpolators_;
};

// Non-template function implementations
std::shared_ptr<PropertyInterpolatorFactory> record(const InterpolatorFactoriesRecord &factories) {
  return std::make_shared<RecordInterpolatorFactory>(factories);
}

std::shared_ptr<PropertyInterpolatorFactory> array(const InterpolatorFactoriesArray &factories) {
  return std::make_shared<ArrayInterpolatorFactory>(factories);
}

std::shared_ptr<PropertyInterpolatorFactory> transforms(
    const std::unordered_map<std::string, std::shared_ptr<StyleOperationInterpolator>> &interpolators) {
  StyleOperationInterpolators result;
  result.reserve(interpolators.size());
  for (const auto &[property, interpolator] : interpolators) {
    result.emplace(static_cast<size_t>(getTransformOperationType(property)), interpolator);
  }
  return std::make_shared<TransformsInterpolatorFactory>(
      std::make_shared<StyleOperationInterpolators>(std::move(result)));
}

std::shared_ptr<PropertyInterpolatorFactory> filters(
    const std::unordered_map<std::string, std::shared_ptr<StyleOperationInterpolator>> &interpolators) {
  StyleOperationInterpolators result;
  result.reserve(interpolators.size());
  for (const auto &[property, interpolator] : interpolators) {
    result.emplace(static_cast<size_t>(getFilterOperationType(property)), interpolator);
  }
  return std::make_shared<FiltersInterpolatorFactory>(std::make_shared<StyleOperationInterpolators>(std::move(result)));
}

} // namespace reanimated::css
