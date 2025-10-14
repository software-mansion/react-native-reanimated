#include <reanimated/CSS/svg/interpolation/InterpolatorFactory.h>

#include <reanimated/CSS/svg/interpolation/transforms/TransformsStyleInterpolator.h>

namespace reanimated::css::svg {

class TransformsInterpolatorFactory : public PropertyInterpolatorFactory {
 public:
  explicit TransformsInterpolatorFactory(
      const std::shared_ptr<TransformOperationInterpolators> &interpolators)
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
  // Helper private type just for a default value
  struct EmptyTransformsValue : public CSSValue {
    folly::dynamic toDynamic() const override {
      return folly::dynamic::array(0, 0, 0, 0, 0, 0);
    }

    std::string toString() const override {
      return "0, 0, 0, 0, 0, 0";
    }
  };

  const std::shared_ptr<TransformOperationInterpolators> interpolators_;
};

std::shared_ptr<PropertyInterpolatorFactory> transforms(
    const std::unordered_map<
        std::string,
        std::shared_ptr<TransformInterpolator>> &interpolators) {
  TransformOperationInterpolators result;
  result.reserve(interpolators.size());
  for (const auto &[property, interpolator] : interpolators) {
    result.emplace(getTransformOperationType(property), interpolator);
  }
  return std::make_shared<TransformsInterpolatorFactory>(
      std::make_shared<TransformOperationInterpolators>(std::move(result)));
}

} // namespace reanimated::css::svg
