#include <reanimated/CSS/interpolation/InterpolatorFactory.h>

namespace reanimated::Interpolators {

class ObjectInterpolatorFactory : public PropertyInterpolatorFactory {
 public:
  explicit ObjectInterpolatorFactory(
      const PropertiesInterpolatorFactories &factories)
      : factories_(factories) {}
  ~ObjectInterpolatorFactory() override = default;

  std::shared_ptr<PropertyInterpolator> create(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath) const override {
    return std::make_shared<ObjectPropertiesInterpolator>(
        factories_, viewStylesRepository, propertyPath);
  }

 protected:
  const PropertiesInterpolatorFactories factories_;
};

template <typename InterpolatorType, typename ValueType>
class ValueInterpolatorFactory : public PropertyInterpolatorFactory {
 public:
  explicit ValueInterpolatorFactory(
      const std::optional<ValueType> &defaultValue)
      : defaultValue_(defaultValue) {}

  std::shared_ptr<PropertyInterpolator> create(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath) const override {
    return std::make_shared<InterpolatorType>(
        defaultValue_, viewStylesRepository, propertyPath);
  }

 private:
  const std::optional<ValueType> defaultValue_;
};

class RelativeOrNumericInterpolatorFactory final
    : public PropertyInterpolatorFactory {
 public:
  explicit RelativeOrNumericInterpolatorFactory(
      const RelativeTo relativeTo,
      std::string relativeProperty,
      const std::optional<UnitValue> &defaultValue)
      : relativeTo_(relativeTo),
        relativeProperty_(std::move(relativeProperty)),
        defaultValue_(defaultValue) {}

  std::shared_ptr<PropertyInterpolator> create(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath) const override {
    return std::make_shared<RelativeOrNumericValueInterpolator>(
        relativeTo_,
        relativeProperty_,
        defaultValue_,
        viewStylesRepository,
        propertyPath);
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
      : interpolators_(interpolators) {}

  std::shared_ptr<PropertyInterpolator> create(
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const PropertyPath &propertyPath) const override {
    return std::make_shared<TransformsStyleInterpolator>(
        interpolators_, viewStylesRepository, propertyPath);
  }

 protected:
  const std::shared_ptr<TransformInterpolators> interpolators_;
};

/**
 * Property interpolators
 */

std::shared_ptr<PropertyInterpolatorFactory> object(
    const PropertiesInterpolatorFactories &factories) {
  return std::make_shared<ObjectInterpolatorFactory>(factories);
}

std::shared_ptr<PropertyInterpolatorFactory> color(
    const std::optional<Color> &defaultValue) {
  return std::make_shared<
      ValueInterpolatorFactory<ColorValueInterpolator, Color>>(defaultValue);
}
std::shared_ptr<PropertyInterpolatorFactory> color() {
  return color(std::nullopt);
}

std::shared_ptr<PropertyInterpolatorFactory> numeric(
    const std::optional<double> &defaultValue) {
  return std::make_shared<
      ValueInterpolatorFactory<NumericValueInterpolator, double>>(defaultValue);
}
std::shared_ptr<PropertyInterpolatorFactory> numeric() {
  return numeric(std::nullopt);
}

std::shared_ptr<PropertyInterpolatorFactory> steps(
    const std::optional<int> &defaultValue) {
  return std::make_shared<
      ValueInterpolatorFactory<NumberStepsInterpolator, int>>(defaultValue);
}
std::shared_ptr<PropertyInterpolatorFactory> steps() {
  return steps(std::nullopt);
}

std::shared_ptr<PropertyInterpolatorFactory> discrete(
    const std::optional<std::string> &defaultValue) {
  return std::make_shared<
      ValueInterpolatorFactory<DiscreteStringInterpolator, std::string>>(
      defaultValue);
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
      defaultValue);
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
