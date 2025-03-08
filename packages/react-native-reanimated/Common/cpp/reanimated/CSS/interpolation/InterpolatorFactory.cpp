#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

namespace reanimated::css {

class RecordInterpolatorFactory : public PropertyInterpolatorFactory {
 public:
  explicit RecordInterpolatorFactory(
      const InterpolatorFactoriesRecord &factories)
      : PropertyInterpolatorFactory(), factories_(factories) {}

  const CSSValue &getDefaultValue() const override {
    static EmptyObjectValue emptyObjectValue;
    return emptyObjectValue;
  }

  std::shared_ptr<PropertyInterpolator> create(
      const PropertyPath &propertyPath,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      const override {
    return std::make_shared<RecordPropertiesInterpolator>(
        factories_, propertyPath, viewStylesRepository);
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

class ArrayInterpolatorFactory : public PropertyInterpolatorFactory {
 public:
  explicit ArrayInterpolatorFactory(const InterpolatorFactoriesArray &factories)
      : PropertyInterpolatorFactory(), factories_(factories) {}

  const CSSValue &getDefaultValue() const override {
    static EmptyArrayValue emptyArrayValue;
    return emptyArrayValue;
  }

  std::shared_ptr<PropertyInterpolator> create(
      const PropertyPath &propertyPath,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      const override {
    return std::make_shared<ArrayPropertiesInterpolator>(
        factories_, propertyPath, viewStylesRepository);
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

  const InterpolatorFactoriesArray factories_;
};

class TransformsInterpolatorFactory : public PropertyInterpolatorFactory {
 public:
  explicit TransformsInterpolatorFactory(
      const std::shared_ptr<TransformInterpolators> &interpolators)
      : PropertyInterpolatorFactory(), interpolators_(interpolators) {}

  const CSSValue &getDefaultValue() const override {
    static EmptyTransformsValue emptyTransformsValue;
    return emptyTransformsValue;
  }

  std::shared_ptr<PropertyInterpolator> create(
      const PropertyPath &propertyPath,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      const override {
    return std::make_shared<TransformsStyleInterpolator>(
        propertyPath, interpolators_, viewStylesRepository);
  }

 private:
  static TransformMatrix &getIdentityMatrix() {
    static TransformMatrix identityMatrix = TransformMatrix::Identity();
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

  const std::shared_ptr<TransformInterpolators> interpolators_;
};

// Non-template function implementations
std::shared_ptr<PropertyInterpolatorFactory> record(
    const InterpolatorFactoriesRecord &factories) {
  return std::make_shared<RecordInterpolatorFactory>(factories);
}

std::shared_ptr<PropertyInterpolatorFactory> array(
    const InterpolatorFactoriesArray &factories) {
  return std::make_shared<ArrayInterpolatorFactory>(factories);
}

std::shared_ptr<PropertyInterpolatorFactory> transforms(
    const std::unordered_map<
        std::string,
        std::shared_ptr<TransformInterpolator>> &interpolators) {
  TransformInterpolators result;
  for (const auto &[property, interpolator] : interpolators) {
    result[getTransformOperationType(property)] = interpolator;
  }
  return std::make_shared<TransformsInterpolatorFactory>(
      std::make_shared<TransformInterpolators>(result));
}

} // namespace reanimated::css
