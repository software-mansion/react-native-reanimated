#include <reanimated/CSS/interpolation/InterpolatorFactory.h>
#include <reanimated/CSS/interpolation/filters/FilterStyleInterpolator.h>

#include <memory>
#include <string>
#include <unordered_map>

namespace reanimated::css {

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
