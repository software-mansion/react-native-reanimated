#ifdef RCT_NEW_ARCH_ENABLED
#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

namespace reanimated::Interpolators {

class ObjectInterpolatorFactory : public PropertyInterpolatorFactory {
 public:
  explicit ObjectInterpolatorFactory(
      const PropertyInterpolatorFactories &factories)
      : PropertyInterpolatorFactory(PropertyType::Object),
        factories_(factories) {}

  std::shared_ptr<PropertyInterpolator> create(
      const PropertyPath &propertyPath,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      const override {
    return std::make_shared<ObjectPropertiesInterpolator>(
        factories_, propertyPath, progressProvider, viewStylesRepository);
  }

 protected:
  const PropertyInterpolatorFactories factories_;
};

template <typename InterpolatorType, typename ValueType>
class ValueInterpolatorFactory : public PropertyInterpolatorFactory {
 public:
  explicit ValueInterpolatorFactory(
      const PropertyType type,
      const std::optional<ValueType> &defaultValue)
      : PropertyInterpolatorFactory(type), defaultValue_(defaultValue) {}

  std::shared_ptr<PropertyInterpolator> create(
      const PropertyPath &propertyPath,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      const override {
    return std::make_shared<InterpolatorType>(
        propertyPath, defaultValue_, progressProvider, viewStylesRepository);
  }

 private:
  const std::optional<ValueType> defaultValue_;
};

class RelativeOrNumericInterpolatorFactory final
    : public PropertyInterpolatorFactory {
 public:
  explicit RelativeOrNumericInterpolatorFactory(
      const RelativeTo relativeTo,
      const std::string &relativeProperty,
      const std::optional<UnitValue> &defaultValue)
      : PropertyInterpolatorFactory(PropertyType::RelativeNumeric),
        relativeTo_(relativeTo),
        relativeProperty_(relativeProperty),
        defaultValue_(defaultValue) {}

  std::shared_ptr<PropertyInterpolator> create(
      const PropertyPath &propertyPath,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      const override {
    return std::make_shared<RelativeOrNumericValueInterpolator>(
        relativeTo_,
        relativeProperty_,
        propertyPath,
        defaultValue_,
        progressProvider,
        viewStylesRepository);
  }

 private:
  const RelativeTo relativeTo_;
  const std::string relativeProperty_;
  const std::optional<UnitValue> defaultValue_;
};

class TransformsStyleInterpolatorFactory final
    : public PropertyInterpolatorFactory {
 public:
  explicit TransformsStyleInterpolatorFactory(
      const std::shared_ptr<TransformInterpolators> &interpolators)
      : PropertyInterpolatorFactory(PropertyType::Transforms),
        interpolators_(interpolators) {}

  std::shared_ptr<PropertyInterpolator> create(
      const PropertyPath &propertyPath,
      const std::shared_ptr<KeyframeProgressProvider> &progressProvider,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
      const override {
    return std::make_shared<TransformsStyleInterpolator>(
        interpolators_, propertyPath, progressProvider, viewStylesRepository);
  }

 protected:
  const std::shared_ptr<TransformInterpolators> interpolators_;
};

/**
 * Property interpolators
 */

std::shared_ptr<PropertyInterpolatorFactory> object(
    const PropertyInterpolatorFactories &factories) {
  return std::make_shared<ObjectInterpolatorFactory>(factories);
}

std::shared_ptr<PropertyInterpolatorFactory> color(
    const std::optional<Color> &defaultValue) {
  return std::make_shared<
      ValueInterpolatorFactory<ColorValueInterpolator, Color>>(
      PropertyType::Color, defaultValue);
}
std::shared_ptr<PropertyInterpolatorFactory> color() {
  return color(std::nullopt);
}

std::shared_ptr<PropertyInterpolatorFactory> numeric(
    const std::optional<double> &defaultValue) {
  return std::make_shared<
      ValueInterpolatorFactory<NumericValueInterpolator, double>>(
      PropertyType::Numeric, defaultValue);
}
std::shared_ptr<PropertyInterpolatorFactory> numeric() {
  return numeric(std::nullopt);
}

std::shared_ptr<PropertyInterpolatorFactory> steps(
    const std::optional<int> &defaultValue) {
  return std::make_shared<
      ValueInterpolatorFactory<NumberStepsInterpolator, int>>(
      PropertyType::Steps, defaultValue);
}
std::shared_ptr<PropertyInterpolatorFactory> steps() {
  return steps(std::nullopt);
}

std::shared_ptr<PropertyInterpolatorFactory> discrete(
    const std::optional<std::string> &defaultValue) {
  return std::make_shared<
      ValueInterpolatorFactory<DiscreteStringInterpolator, std::string>>(
      PropertyType::Discrete, defaultValue);
}
std::shared_ptr<PropertyInterpolatorFactory> discrete() {
  return discrete(std::nullopt);
}

std::shared_ptr<PropertyInterpolatorFactory> relOrNum(
    const RelativeTo relativeTo,
    const std::string &relativeProperty,
    const std::optional<UnitValue> &defaultValue) {
  return std::make_shared<RelativeOrNumericInterpolatorFactory>(
      relativeTo, relativeProperty, defaultValue);
}
std::shared_ptr<PropertyInterpolatorFactory> relOrNum(
    const RelativeTo relativeTo,
    const std::string &relativeProperty,
    const double defaultValue) {
  return relOrNum(relativeTo, relativeProperty, UnitValue(defaultValue));
}
std::shared_ptr<PropertyInterpolatorFactory> relOrNum(
    const RelativeTo relativeTo,
    const std::string &relativeProperty,
    const std::string &defaultValue) {
  return relOrNum(relativeTo, relativeProperty, UnitValue(defaultValue));
}
std::shared_ptr<PropertyInterpolatorFactory> relOrNum(
    const RelativeTo relativeTo,
    const std::string &relativeProperty) {
  return relOrNum(relativeTo, relativeProperty, std::nullopt);
}

std::shared_ptr<PropertyInterpolatorFactory> transformOrigin(
    const TransformOrigin &defaultValue) {
  return std::make_shared<
      ValueInterpolatorFactory<TransformOriginInterpolator, TransformOrigin>>(
      PropertyType::TransformOrigin, defaultValue);
}
std::shared_ptr<PropertyInterpolatorFactory> transformOrigin(
    const std::variant<double, std::string> &x,
    const std::variant<double, std::string> &y,
    const double z) {
  return transformOrigin(TransformOrigin(x, y, z));
}

std::shared_ptr<PropertyInterpolatorFactory> transforms(
    const TransformInterpolatorsMap &interpolators) {
  TransformInterpolators result;

  for (const auto &[property, interpolator] : interpolators) {
    result[getTransformOperationType(property)] = interpolator;
  }
  return std::make_shared<TransformsStyleInterpolatorFactory>(
      std::make_shared<TransformInterpolators>(result));
}

/**
 * Transform interpolators
 */

std::shared_ptr<TransformInterpolator> perspective(const double defaultValue) {
  return std::make_shared<PerspectiveTransformInterpolator>(defaultValue);
}

std::shared_ptr<TransformInterpolator> rotate(const AngleValue &defaultValue) {
  return std::make_shared<AngleTransformInterpolator<RotateOperation>>(
      defaultValue);
}
std::shared_ptr<TransformInterpolator> rotate(const std::string &defaultValue) {
  return rotate(AngleValue(defaultValue));
}
std::shared_ptr<TransformInterpolator> rotateX(const AngleValue &defaultValue) {
  return std::make_shared<AngleTransformInterpolator<RotateXOperation>>(
      defaultValue);
}
std::shared_ptr<TransformInterpolator> rotateX(
    const std::string &defaultValue) {
  return rotateX(AngleValue(defaultValue));
}
std::shared_ptr<TransformInterpolator> rotateY(const AngleValue &defaultValue) {
  return std::make_shared<AngleTransformInterpolator<RotateYOperation>>(
      defaultValue);
}
std::shared_ptr<TransformInterpolator> rotateY(
    const std::string &defaultValue) {
  return rotateY(AngleValue(defaultValue));
}
std::shared_ptr<TransformInterpolator> rotateZ(const AngleValue &defaultValue) {
  return std::make_shared<AngleTransformInterpolator<RotateZOperation>>(
      defaultValue);
}
std::shared_ptr<TransformInterpolator> rotateZ(
    const std::string &defaultValue) {
  return rotateZ(AngleValue(defaultValue));
}

std::shared_ptr<TransformInterpolator> scale(const double defaultValue) {
  return std::make_shared<ScaleTransformInterpolator<ScaleOperation>>(
      defaultValue);
}
std::shared_ptr<TransformInterpolator> scaleX(const double defaultValue) {
  return std::make_shared<ScaleTransformInterpolator<ScaleXOperation>>(
      defaultValue);
}
std::shared_ptr<TransformInterpolator> scaleY(const double defaultValue) {
  return std::make_shared<ScaleTransformInterpolator<ScaleYOperation>>(
      defaultValue);
}

std::shared_ptr<TransformInterpolator> translateX(
    RelativeTo relativeTo,
    const std::string &relativeProperty,
    const UnitValue &defaultValue) {
  return std::make_shared<TranslateTransformInterpolator<TranslateXOperation>>(
      relativeTo, relativeProperty, defaultValue);
}
std::shared_ptr<TransformInterpolator> translateX(
    RelativeTo relativeTo,
    const std::string &relativeProperty,
    const double defaultValue) {
  return translateX(relativeTo, relativeProperty, UnitValue(defaultValue));
}
std::shared_ptr<TransformInterpolator> translateY(
    RelativeTo relativeTo,
    const std::string &relativeProperty,
    const UnitValue &defaultValue) {
  return std::make_shared<TranslateTransformInterpolator<TranslateYOperation>>(
      relativeTo, relativeProperty, defaultValue);
}
std::shared_ptr<TransformInterpolator> translateY(
    RelativeTo relativeTo,
    const std::string &relativeProperty,
    const double defaultValue) {
  return translateY(relativeTo, relativeProperty, UnitValue(defaultValue));
}

std::shared_ptr<TransformInterpolator> skewX(const AngleValue &defaultValue) {
  return std::make_shared<AngleTransformInterpolator<SkewXOperation>>(
      defaultValue);
}
std::shared_ptr<TransformInterpolator> skewX(const std::string &defaultValue) {
  return skewX(AngleValue(defaultValue));
}
std::shared_ptr<TransformInterpolator> skewY(const AngleValue &defaultValue) {
  return std::make_shared<AngleTransformInterpolator<SkewYOperation>>(
      defaultValue);
}
std::shared_ptr<TransformInterpolator> skewY(const std::string &defaultValue) {
  return skewY(AngleValue(defaultValue));
}

std::shared_ptr<TransformInterpolator> matrix(
    const TransformMatrix &defaultValue) {
  return std::make_shared<MatrixTransformInterpolator>(defaultValue);
}

} // namespace reanimated::Interpolators

#endif // RCT_NEW_ARCH_ENABLED
