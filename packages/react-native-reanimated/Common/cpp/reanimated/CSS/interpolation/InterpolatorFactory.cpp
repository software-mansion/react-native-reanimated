#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

namespace reanimated::Interpolators {

class RecordInterpolatorFactory : public PropertyInterpolatorFactory {
 public:
  explicit RecordInterpolatorFactory(
      const InterpolatorFactoriesRecord &factories)
      : PropertyInterpolatorFactory(), factories_(factories) {}

  std::shared_ptr<PropertyInterpolator> create(
      const PropertyPath &propertyPath,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      const override {
    return std::make_shared<RecordPropertiesInterpolator>(
        factories_, propertyPath, progressProvider, viewStylesRepository);
  }

 private:
  const InterpolatorFactoriesRecord factories_;
};

class ArrayInterpolatorFactory : public PropertyInterpolatorFactory {
 public:
  explicit ArrayInterpolatorFactory(const InterpolatorFactoriesArray &factories)
      : PropertyInterpolatorFactory(), factories_(factories) {}

  std::shared_ptr<PropertyInterpolator> create(
      const PropertyPath &propertyPath,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      const override {
    return std::make_shared<ArrayPropertiesInterpolator>(
        factories_, propertyPath, progressProvider, viewStylesRepository);
  }

 private:
  const InterpolatorFactoriesArray factories_;
};

class TransformsInterpolatorFactory : public PropertyInterpolatorFactory {
 public:
  explicit TransformsInterpolatorFactory(
      const std::shared_ptr<TransformInterpolators> &interpolators)
      : PropertyInterpolatorFactory(), interpolators_(interpolators) {}

  std::shared_ptr<PropertyInterpolator> create(
      const PropertyPath &propertyPath,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      const override {
    return std::make_shared<TransformsStyleInterpolator>(
        propertyPath, interpolators_, progressProvider, viewStylesRepository);
  }

 private:
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

} // namespace reanimated::Interpolators

#endif // RCT_NEW_ARCH_ENABLED
