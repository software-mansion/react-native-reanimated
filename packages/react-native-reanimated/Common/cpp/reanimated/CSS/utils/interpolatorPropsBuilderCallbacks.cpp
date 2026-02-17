#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/utils/interpolatorPropsBuilderCallbacks.h>
#include <reanimated/CSS/utils/interpolatorPropsBuilderCallbacksHelper.h>
#include <reanimated/CSS/utils/propsLayoutFilter.h>

#include <react/renderer/animationbackend/AnimatedPropsBuilder.h>
#include <react/renderer/animationbackend/AnimationBackend.h>
#include <react/renderer/graphics/Transform.h>

#include <memory>
#include <unordered_map>

using namespace facebook::react;

namespace reanimated::css {

using namespace detail;

void addWidthToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(WIDTH)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  std::visit(
      [&](const auto &active_value) {
        using T = std::decay_t<decltype(active_value)>;

        if constexpr (std::is_same_v<T, CSSLength>) {
          const CSSLength &cssValue = active_value;
          propsBuilder->setWidth(cssLengthToSizeLength(cssValue));

        } else if constexpr (std::is_same_v<T, CSSKeyword>) {
          const CSSKeyword &cssValue = active_value;
          propsBuilder->setWidth(strToYogaSizeLength(cssValue.toString()));
        }
      },
      storage);
}

void addHeightToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(HEIGHT)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  std::visit(
      [&](const auto &active_value) {
        using T = std::decay_t<decltype(active_value)>;

        if constexpr (std::is_same_v<T, CSSLength>) {
          const CSSLength &cssValue = active_value;
          propsBuilder->setHeight(cssLengthToSizeLength(cssValue));

        } else if constexpr (std::is_same_v<T, CSSKeyword>) {
          const CSSKeyword &cssValue = active_value;
          propsBuilder->setHeight(strToYogaSizeLength(cssValue.toString()));
        }
      },
      storage);
}

void addBackgroundColorToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSColor> &value) {
  if (shouldSkipNonLayoutProp(BACKGROUND_COLOR)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSColor>(storage);
  auto color = parseCSSColor(cssValue);
  propsBuilder->setBackgroundColor(SharedColor(color));
}

void addOpacityToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  if (shouldSkipNonLayoutProp(OPACITY)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSDouble>(storage);
  propsBuilder->setOpacity(cssValue.value);
}

void addBorderRadiusToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength> &value) {
  addCascadedBorderRadiiToPropsBuilder(propsBuilder, value, "all");
}

void addBorderTopRightRadiusToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength> &value) {
  addCascadedBorderRadiiToPropsBuilder(propsBuilder, value, "topRight");
}

void addBorderTopLeftRadiusToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength> &value) {
  addCascadedBorderRadiiToPropsBuilder(propsBuilder, value, "topLeft");
}

void addBorderBottomRightRadiusToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength> &value) {
  addCascadedBorderRadiiToPropsBuilder(propsBuilder, value, "bottomRight");
}

void addBorderBottomLeftRadiusToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength> &value) {
  addCascadedBorderRadiiToPropsBuilder(propsBuilder, value, "bottomLeft");
}

void addBorderTopStartRadiusToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength> &value) {
  addCascadedBorderRadiiToPropsBuilder(propsBuilder, value, "topStart");
}

void addBorderTopEndRadiusToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength> &value) {
  addCascadedBorderRadiiToPropsBuilder(propsBuilder, value, "topEnd");
}

void addBorderBottomStartRadiusToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength> &value) {
  addCascadedBorderRadiiToPropsBuilder(propsBuilder, value, "bottomStart");
}

void addBorderBottomEndRadiusToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength> &value) {
  addCascadedBorderRadiiToPropsBuilder(propsBuilder, value, "bottomEnd");
}

void addBorderStartStartRadiusToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength> &value) {
  addCascadedBorderRadiiToPropsBuilder(propsBuilder, value, "startStart");
}

void addBorderStartEndRadiusToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength> &value) {
  addCascadedBorderRadiiToPropsBuilder(propsBuilder, value, "startEnd");
}

void addBorderEndStartRadiusToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength> &value) {
  addCascadedBorderRadiiToPropsBuilder(propsBuilder, value, "endStart");
}

void addBorderEndEndRadiusToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength> &value) {
  addCascadedBorderRadiiToPropsBuilder(propsBuilder, value, "endEnd");
}

void addBorderWidthToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  addBorderWidth(propsBuilder, value, "all");
}

void addBorderBottomWidthToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  addBorderWidth(propsBuilder, value, "bottom");
}

void addBorderTopWidthToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  addBorderWidth(propsBuilder, value, "top");
}

void addBorderLeftWidthToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  addBorderWidth(propsBuilder, value, "left");
}

void addBorderRightWidthToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  addBorderWidth(propsBuilder, value, "right");
}

void addBorderStartWidthToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  addBorderWidth(propsBuilder, value, "start");
}

void addBorderEndWidthToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  addBorderWidth(propsBuilder, value, "end");
}

void addMarginToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  addMargin(propsBuilder, value, "all");
}

void addMarginTopToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  addMargin(propsBuilder, value, "top");
}

void addMarginBottomToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  addMargin(propsBuilder, value, "bottom");
}

void addMarginLeftToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  addMargin(propsBuilder, value, "left");
}

void addMarginRightToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  addMargin(propsBuilder, value, "right");
}

void addMarginStartToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  addMargin(propsBuilder, value, "start");
}

void addMarginEndToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  addMargin(propsBuilder, value, "end");
}

void addMarginHorizontalToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  addMargin(propsBuilder, value, "horizontal");
}

void addMarginVerticalToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  addMargin(propsBuilder, value, "vertical");
}

void addPaddingToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  addPadding(propsBuilder, value, "all");
}

void addPaddingTopToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  addPadding(propsBuilder, value, "top");
}

void addPaddingBottomToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  addPadding(propsBuilder, value, "bottom");
}

void addPaddingLeftToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  addPadding(propsBuilder, value, "left");
}

void addPaddingRightToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  addPadding(propsBuilder, value, "right");
}

void addPaddingStartToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  addPadding(propsBuilder, value, "start");
}

void addPaddingEndToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  addPadding(propsBuilder, value, "end");
}

void addPaddingHorizontalToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  addPadding(propsBuilder, value, "horizontal");
}

void addPaddingVerticalToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  addPadding(propsBuilder, value, "vertical");
}

void addBlurFilterToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    BlurOperation &operation) {
  Float blurValue = static_cast<Float>(operation.value.value);
  FilterFunction filterFunction = FilterFunction{FilterType::Blur, std::variant<Float, DropShadowParams>{blurValue}};
  addFilter(propsBuilder, filterFunction);
}

void addBrightnessFilterToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    BrightnessOperation &operation) {
  Float brightnessValue = static_cast<Float>(operation.value.value);
  FilterFunction filterFunction =
      FilterFunction{FilterType::Brightness, std::variant<Float, DropShadowParams>{brightnessValue}};
  addFilter(propsBuilder, filterFunction);
}

void addContrastFilterToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    ContrastOperation &operation) {
  Float contrastValue = static_cast<Float>(operation.value.value);
  FilterFunction filterFuntion =
      FilterFunction{FilterType::Contrast, std::variant<Float, DropShadowParams>{contrastValue}};
  addFilter(propsBuilder, filterFuntion);
}

void addDropShadowFilterToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    DropShadowOperation &operation) {

  DropShadowParams dropShadowParams = DropShadowParams{
      static_cast<Float>(operation.value.offsetX.value),
      static_cast<Float>(operation.value.offsetY.value),
      static_cast<Float>(operation.value.standardDeviation.value),
      SharedColor(parseCSSColor(operation.value.color))};

  FilterFunction filterFunction =
      FilterFunction{FilterType::DropShadow, std::variant<Float, DropShadowParams>{dropShadowParams}};
  addFilter(propsBuilder, filterFunction);
}

void addGrayscaleFilterToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    GrayscaleOperation &operation) {
  Float grayScaleValue = static_cast<Float>(operation.value.value);
  FilterFunction filterFunction =
      FilterFunction{FilterType::Grayscale, std::variant<Float, DropShadowParams>{grayScaleValue}};
  addFilter(propsBuilder, filterFunction);
}

void addHueRotateFilterToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    HueRotateOperation &operation) {
  Float hueRotateValue = static_cast<Float>(operation.value.value);
  FilterFunction filterFunction =
      FilterFunction{FilterType::HueRotate, std::variant<Float, DropShadowParams>{hueRotateValue}};
  addFilter(propsBuilder, filterFunction);
}

void addInvertFilterToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    InvertOperation &operation) {
  Float invertValue = static_cast<Float>(operation.value.value);
  FilterFunction filterFunction =
      FilterFunction{FilterType::Invert, std::variant<Float, DropShadowParams>{invertValue}};
  addFilter(propsBuilder, filterFunction);
}

void addOpacityFilterToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    OpacityOperation &operation) {
  Float opacityValue = static_cast<Float>(operation.value.value);
  FilterFunction filterFunction =
      FilterFunction{FilterType::Opacity, std::variant<Float, DropShadowParams>{opacityValue}};
  addFilter(propsBuilder, filterFunction);
}

void addSaturateFilterToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    SaturateOperation &operation) {
  Float saturateValue = static_cast<Float>(operation.value.value);
  FilterFunction filterFunction =
      FilterFunction{FilterType::Saturate, std::variant<Float, DropShadowParams>{saturateValue}};
  addFilter(propsBuilder, filterFunction);
}

void addSepiaFilterToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    SepiaOperation &operation) {
  Float sepiaValue = static_cast<Float>(operation.value.value);
  FilterFunction filterFunction = FilterFunction{FilterType::Sepia, std::variant<Float, DropShadowParams>{sepiaValue}};
  addFilter(propsBuilder, filterFunction);
}

void addPerspectiveTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    PerspectiveOperation &operation) {
  Transform transform{};
  auto transformOperation = Transform::DefaultTransformOperation(TransformOperationType::Perspective);
  auto value = ValueUnit(operation.value.value, UnitType::Point);
  transformOperation.x = value;
  transform.operations.push_back(transformOperation);
  addTransform(propsBuilder, transform);
}

void addRotateTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    RotateOperation &operation) {
  Transform transform{};
  auto transformOperation = Transform::DefaultTransformOperation(TransformOperationType::Rotate);
  auto value = ValueUnit(operation.value.value, UnitType::Point);
  transformOperation.z = value;
  transform.operations.push_back(transformOperation);
  addTransform(propsBuilder, transform);
}

void addRotateXTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    RotateXOperation &operation) {
  Transform transform{};
  auto transformOperation = Transform::DefaultTransformOperation(TransformOperationType::Rotate);
  auto value = ValueUnit(operation.value.value, UnitType::Point);
  transformOperation.x = value;
  transform.operations.push_back(transformOperation);
  addTransform(propsBuilder, transform);
}

void addRotateYTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    RotateYOperation &operation) {
  Transform transform{};
  auto transformOperation = Transform::DefaultTransformOperation(TransformOperationType::Rotate);
  auto value = ValueUnit(operation.value.value, UnitType::Point);
  transformOperation.y = value;
  transform.operations.push_back(transformOperation);
  addTransform(propsBuilder, transform);
}

void addRotateZTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    RotateZOperation &operation) {
  Transform transform{};
  auto transformOperation = Transform::DefaultTransformOperation(TransformOperationType::Rotate);
  auto value = ValueUnit(operation.value.value, UnitType::Point);
  transformOperation.z = value;
  transform.operations.push_back(transformOperation);
  addTransform(propsBuilder, transform);
}

void addScaleTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    ScaleOperation &operation) {
  Transform transform{};
  auto transformOperation = Transform::DefaultTransformOperation(TransformOperationType::Scale);
  auto value = ValueUnit(operation.value.value, UnitType::Point);
  transformOperation.x = value;
  transformOperation.y = value;
  transformOperation.z = value;
  transform.operations.push_back(transformOperation);
  addTransform(propsBuilder, transform);
}

void addScaleXTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    ScaleXOperation &operation) {
  Transform transform{};
  auto transformOperation = Transform::DefaultTransformOperation(TransformOperationType::Scale);
  transformOperation.x = ValueUnit(operation.value.value, UnitType::Point);
  transform.operations.push_back(transformOperation);
  addTransform(propsBuilder, transform);
}

void addScaleYTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    ScaleYOperation &operation) {
  Transform transform{};
  auto transformOperation = Transform::DefaultTransformOperation(TransformOperationType::Scale);
  transformOperation.y = ValueUnit(operation.value.value, UnitType::Point);
  transform.operations.push_back(transformOperation);
  addTransform(propsBuilder, transform);
}

void addTranslateXTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    TranslateXOperation &operation) {
  Transform transform{};
  auto transformOperation = Transform::DefaultTransformOperation(TransformOperationType::Translate);
  transformOperation.x = cssLengthToValueUnit(operation.value);
  transform.operations.push_back(transformOperation);
  addTransform(propsBuilder, transform);
}

void addTranslateYTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    TranslateYOperation &operation) {
  Transform transform{};
  auto transformOperation = Transform::DefaultTransformOperation(TransformOperationType::Translate);
  transformOperation.y = cssLengthToValueUnit(operation.value);
  transform.operations.push_back(transformOperation);
  addTransform(propsBuilder, transform);
}

void addSkewXTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    SkewXOperation &operation) {
  Transform transform{};
  auto transformOperation = Transform::DefaultTransformOperation(TransformOperationType::Skew);
  transformOperation.x = ValueUnit(operation.value.value, UnitType::Point);
  transform.operations.push_back(transformOperation);
  addTransform(propsBuilder, transform);
}

void addSkewYTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    SkewYOperation &operation) {
  Transform transform{};
  auto transformOperation = Transform::DefaultTransformOperation(TransformOperationType::Skew);
  transformOperation.y = ValueUnit(operation.value.value, UnitType::Point);
  transform.operations.push_back(transformOperation);
  addTransform(propsBuilder, transform);
}

void addMatrixTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    MatrixOperation &operation) {
  TransformMatrix::Shared transformMatrix = operation.toMatrix(true);
  Transform transform = Transform::Identity();
  transform.operations.push_back(Transform::DefaultTransformOperation(TransformOperationType::Arbitrary));
  for (size_t i = 0; i < transformMatrix->getSize() && i < transform.matrix.size(); ++i) {
    transform.matrix[i] = static_cast<Float>((*transformMatrix)[i]);
  }
  addTransform(propsBuilder, transform);
}

void addBorderColorToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSColor> &value) {
  addBorderColor(propsBuilder, value, "all");
}

void addBorderEndColorToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSColor> &value) {
  addBorderColor(propsBuilder, value, "end");
}

void addBorderStartColorToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSColor> &value) {
  addBorderColor(propsBuilder, value, "start");
}

void addBorderLeftColorToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSColor> &value) {
  addBorderColor(propsBuilder, value, "left");
}

void addBorderRightColorToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSColor> &value) {
  addBorderColor(propsBuilder, value, "right");
}

void addBorderTopColorToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSColor> &value) {
  addBorderColor(propsBuilder, value, "top");
}

void addBorderBottomColorToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSColor> &value) {
  addBorderColor(propsBuilder, value, "bottom");
}

void addBorderBlockColorToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSColor> &value) {
  addBorderColor(propsBuilder, value, "block");
}

void addBorderBlockEndColorToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSColor> &value) {
  addBorderColor(propsBuilder, value, "blockEnd");
}

void addBorderBlockStartColorToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSColor> &value) {
  addBorderColor(propsBuilder, value, "blockStart");
}

void addOutlineColorToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSColor> &value) {
  if (shouldSkipNonLayoutProp(OUTLINE_COLOR)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssColor = std::get<CSSColor>(storage);
  propsBuilder->setOutlineColor(SharedColor(parseCSSColor(cssColor)));
}

void addOutlineOffsetToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  if (shouldSkipNonLayoutProp(OUTLINE_OFFSET)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSDouble>(storage);
  propsBuilder->setOutlineOffset(cssValue.value);
}

void addOutlineStyleToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(OUTLINE_STYLE)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSKeyword>(storage);
  const auto outlineStyleStr = cssValue.toString();
  static const std::unordered_map<std::string, OutlineStyle> outlineStyleMap = {
      {"solid", OutlineStyle::Solid},
      {"dotted", OutlineStyle::Dotted},
      {"dashed", OutlineStyle::Dashed},
  };

  const auto it = outlineStyleMap.find(outlineStyleStr);
  if (it == outlineStyleMap.end()) {
    return;
  }

  propsBuilder->setOutlineStyle(it->second);
}

void addOutlineWidthToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  if (shouldSkipNonLayoutProp(OUTLINE_WIDTH)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSDouble>(storage);
  propsBuilder->setOutlineWidth(cssValue.value);
}

void addFlexToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  if (shouldSkipNonLayoutProp(FLEX)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSDouble>(storage);
  propsBuilder->setFlex(yoga::FloatOptional(cssValue.value));
}

void addAlignContentToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(ALIGN_CONTENT)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSKeyword>(storage);
  propsBuilder->setAlignContent(strToYogaAlign(cssValue.toString()));
}

void addAlignItemsToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(ALIGN_ITEMS)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSKeyword>(storage);
  propsBuilder->setAlignItems(strToYogaAlign(cssValue.toString()));
}

void addAlignSelfToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(ALIGN_SELF)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSKeyword>(storage);
  propsBuilder->setAlignSelf(strToYogaAlign(cssValue.toString()));
}

void addAspectRatioToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble, CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(ASPECT_RATIO)) {
    return;
  }
  const auto &storage = value.getStorageRef();

  std::visit(
      [&](const auto &active_value) {
        using T = std::decay_t<decltype(active_value)>;

        if constexpr (std::is_same_v<T, CSSDouble>) {
          const CSSDouble &cssValue = active_value;
          propsBuilder->setAspectRatio(yoga::FloatOptional(cssValue.value));
        } else if constexpr (std::is_same_v<T, CSSKeyword>) {
          const CSSKeyword &cssValue = active_value;
          if (cssValue.toString() == "auto") {
            // degenerate aspect ratios act as auto.
            // see https://drafts.csswg.org/css-sizing-4/#valdef-aspect-ratio-ratio
            propsBuilder->setAspectRatio(yoga::FloatOptional(0));
          }
        }
      },
      storage);
}

void addBoxSizingToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(BOX_SIZING)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSKeyword>(storage);
  const auto boxSizing = cssValue.toString();
  static const std::unordered_map<std::string, yoga::BoxSizing> boxSizingMap = {
      {"border-box", yoga::BoxSizing::BorderBox},
      {"content-box", yoga::BoxSizing::ContentBox},
  };

  const auto it = boxSizingMap.find(boxSizing);
  if (it == boxSizingMap.end()) {
    return;
  }

  propsBuilder->setBoxSizing(it->second);
}

void addDisplayToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDisplay> &value) {
  if (shouldSkipNonLayoutProp(DISPLAY)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSDisplay>(storage);
  const auto display = cssValue.toString();
  static const std::unordered_map<std::string, yoga::Display> displayMap = {
      {"flex", yoga::Display::Flex},
      {"none", yoga::Display::None},
      {"contents", yoga::Display::Contents},
  };

  const auto it = displayMap.find(display);
  if (it == displayMap.end()) {
    return;
  }

  propsBuilder->setDisplay(it->second);
}

void addFlexBasisToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(FLEX_BASIS)) {
    return;
  }
  const auto &storage = value.getStorageRef();

  std::visit(
      [&](const auto &active_value) {
        using T = std::decay_t<decltype(active_value)>;

        if constexpr (std::is_same_v<T, CSSLength>) {
          const CSSLength &cssValue = active_value;
          propsBuilder->setFlexBasis(cssLengthToSizeLength(cssValue));
        } else if constexpr (std::is_same_v<T, CSSKeyword>) {
          const CSSKeyword &cssValue = active_value;
          propsBuilder->setFlexBasis(strToYogaSizeLength(cssValue.toString()));
        }
      },
      storage);
}

void addFlexDirectionToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(FLEX_DIRECTION)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSKeyword>(storage);
  const auto flexDirection = cssValue.toString();
  static const std::unordered_map<std::string, yoga::FlexDirection> flexDirectionMap = {
      {"column", yoga::FlexDirection::Column},
      {"column-reverse", yoga::FlexDirection::ColumnReverse},
      {"row", yoga::FlexDirection::Row},
      {"row-reverse", yoga::FlexDirection::RowReverse},
  };

  const auto it = flexDirectionMap.find(flexDirection);
  if (it == flexDirectionMap.end()) {
    return;
  }

  propsBuilder->setFlexDirection(it->second);
}

void addRowGapToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength> &value) {
  if (shouldSkipNonLayoutProp(ROW_GAP)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSLength>(storage);
  propsBuilder->setRowGap(cssLengthToStyleLength(cssValue));
}

void addColumnGapToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength> &value) {
  if (shouldSkipNonLayoutProp(COLUMN_GAP)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSLength>(storage);
  propsBuilder->setColumnGap(cssLengthToStyleLength(cssValue));
}

void addFlexGrowToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  if (shouldSkipNonLayoutProp(FLEX_GROW)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSDouble>(storage);
  propsBuilder->setFlexGrow(yoga::FloatOptional(cssValue.value));
}

void addFlexShrinkToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  if (shouldSkipNonLayoutProp(FLEX_SHRINK)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSDouble>(storage);
  propsBuilder->setFlexShrink(yoga::FloatOptional(cssValue.value));
}

void addFlexWrapToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(FLEX_WRAP)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSKeyword>(storage);
  const auto flexWrap = cssValue.toString();
  static const std::unordered_map<std::string, yoga::Wrap> flexWrapMap = {
      {"no-wrap", yoga::Wrap::NoWrap},
      {"wrap", yoga::Wrap::Wrap},
      {"wrap-reverse", yoga::Wrap::WrapReverse},
  };

  const auto it = flexWrapMap.find(flexWrap);
  if (it == flexWrapMap.end()) {
    return;
  }

  propsBuilder->setFlexWrap(it->second);
}

void addJustifyContentToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(JUSTIFY_CONTENT)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSKeyword>(storage);
  const auto justifyContent = cssValue.toString();
  static const std::unordered_map<std::string, yoga::Justify> justifyContentMap = {
      {"flex-start", yoga::Justify::FlexStart},
      {"center", yoga::Justify::Center},
      {"flex-end", yoga::Justify::FlexEnd},
      {"space-between", yoga::Justify::SpaceBetween},
      {"space-around", yoga::Justify::SpaceAround},
      {"space-evenly", yoga::Justify::SpaceEvenly},
  };

  const auto it = justifyContentMap.find(justifyContent);
  if (it == justifyContentMap.end()) {
    return;
  }

  propsBuilder->setJustifyContent(it->second);
}

void addMaxWidthToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(MAX_WIDTH)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  std::visit(
      [&](const auto &active_value) {
        using T = std::decay_t<decltype(active_value)>;

        if constexpr (std::is_same_v<T, CSSLength>) {
          const CSSLength &cssValue = active_value;
          propsBuilder->setMaxWidth(cssLengthToSizeLength(cssValue));

        } else if constexpr (std::is_same_v<T, CSSKeyword>) {
          const CSSKeyword &cssValue = active_value;
          const auto keyword = cssValue.toString();
          propsBuilder->setMaxWidth(strToYogaSizeLength(keyword));
        }
      },
      storage);
}

void addMinWidthToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(MIN_WIDTH)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  std::visit(
      [&](const auto &active_value) {
        using T = std::decay_t<decltype(active_value)>;

        if constexpr (std::is_same_v<T, CSSLength>) {
          const CSSLength &cssValue = active_value;
          propsBuilder->setMinWidth(cssLengthToSizeLength(cssValue));

        } else if constexpr (std::is_same_v<T, CSSKeyword>) {
          const CSSKeyword &cssValue = active_value;
          const auto keyword = cssValue.toString();
          propsBuilder->setMinWidth(strToYogaSizeLength(keyword));
        }
      },
      storage);
}

void addMaxHeightToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(MAX_HEIGHT)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  std::visit(
      [&](const auto &active_value) {
        using T = std::decay_t<decltype(active_value)>;

        if constexpr (std::is_same_v<T, CSSLength>) {
          const CSSLength &cssValue = active_value;
          propsBuilder->setMaxHeight(cssLengthToSizeLength(cssValue));

        } else if constexpr (std::is_same_v<T, CSSKeyword>) {
          const CSSKeyword &cssValue = active_value;
          const auto keyword = cssValue.toString();
          propsBuilder->setMaxHeight(strToYogaSizeLength(keyword));
        }
      },
      storage);
}

void addMinHeightToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(MIN_HEIGHT)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  std::visit(
      [&](const auto &active_value) {
        using T = std::decay_t<decltype(active_value)>;

        if constexpr (std::is_same_v<T, CSSLength>) {
          const CSSLength &cssValue = active_value;
          propsBuilder->setMinHeight(cssLengthToSizeLength(cssValue));

        } else if constexpr (std::is_same_v<T, CSSKeyword>) {
          const CSSKeyword &cssValue = active_value;
          const auto keyword = cssValue.toString();
          propsBuilder->setMinHeight(strToYogaSizeLength(keyword));
        }
      },
      storage);
}

void addPositionToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(POSITION_TYPE)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSKeyword>(storage);
  const auto keyword = cssValue.toString();
  static const std::unordered_map<std::string, yoga::PositionType> positionMap = {
      {"static", yoga::PositionType::Static},
      {"absolute", yoga::PositionType::Absolute},
      {"relative", yoga::PositionType::Relative},
  };

  const auto it = positionMap.find(keyword);
  if (it == positionMap.end()) {
    return;
  }

  propsBuilder->setPositionType(it->second);
}

void addZIndexToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSInteger> &value) {
  if (shouldSkipNonLayoutProp(Z_INDEX)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSInteger>(storage);
  propsBuilder->setZIndex(cssValue.value);
}

void addDirectionToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(DIRECTION)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSKeyword>(storage);
  const auto keyword = cssValue.toString();
  static const std::unordered_map<std::string, yoga::Direction> directionMap = {
      {"inherit", yoga::Direction::Inherit},
      {"ltr", yoga::Direction::LTR},
      {"rtl", yoga::Direction::RTL},
  };

  const auto it = directionMap.find(keyword);
  if (it == directionMap.end()) {
    return;
  }

  propsBuilder->setDirection(it->second);
}

void addBackfaceVisibilityToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(BACKFACE_VISIBILITY)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSKeyword>(storage);
  const auto keyword = cssValue.toString();
  static const std::unordered_map<std::string, BackfaceVisibility> backfaceVisibilityMap = {
      {"auto", BackfaceVisibility::Auto},
      {"visible", BackfaceVisibility::Visible},
      {"hidden", BackfaceVisibility::Hidden},
  };

  const auto it = backfaceVisibilityMap.find(keyword);
  if (it == backfaceVisibilityMap.end()) {
    return;
  }

  propsBuilder->setBackfaceVisibility(it->second);
}

void addBorderCurveToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(BORDER_CURVES)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSKeyword>(storage);
  const auto keyword = cssValue.toString();
  static const std::unordered_map<std::string, BorderCurve> borderCurveMap = {
      {"circular", BorderCurve::Circular},
      {"continuous", BorderCurve::Continuous},
  };

  const auto it = borderCurveMap.find(keyword);
  if (it == borderCurveMap.end()) {
    return;
  }

  CascadedBorderCurves borderCurves{.all = it->second};
  propsBuilder->setBorderCurves(borderCurves);
}

void addBorderStyleToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(BORDER_STYLES)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSKeyword>(storage);
  const auto keyword = cssValue.toString();
  static const std::unordered_map<std::string, BorderStyle> borderStyleMap = {
      {"solid", BorderStyle::Solid},
      {"dotted", BorderStyle::Dotted},
      {"dashed", BorderStyle::Dashed},
  };

  const auto it = borderStyleMap.find(keyword);
  if (it == borderStyleMap.end()) {
    return;
  }

  CascadedBorderStyles borderStyles = CascadedBorderStyles{.all = it->second};
  propsBuilder->setBorderStyles(borderStyles);
}

void addElevationToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  const auto &storage = value.getStorageRef();
  const auto &cssDouble = std::get<CSSDouble>(storage);
  folly::dynamic d = folly::dynamic::object("elevation", cssDouble.value);
  propsBuilder->storeDynamic(d);
}

void addOverflowToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(STYLE_OVERFLOW)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSKeyword>(storage);
  const auto keyword = cssValue.toString();
  static const std::unordered_map<std::string, yoga::Overflow> overflowStyleMap = {
      {"visible", yoga::Overflow::Visible},
      {"hidden", yoga::Overflow::Hidden},
      {"scroll", yoga::Overflow::Scroll},
  };

  const auto it = overflowStyleMap.find(keyword);
  if (it == overflowStyleMap.end()) {
    return;
  }

  propsBuilder->setOverflow(it->second);
}

void addPointerEventsToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(POINTER_EVENTS)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSKeyword>(storage);
  const auto keyword = cssValue.toString();
  static const std::unordered_map<std::string, PointerEventsMode> pointerEventsMap = {
      {"auto", PointerEventsMode::Auto},
      {"none", PointerEventsMode::None},
      {"box-only", PointerEventsMode::BoxOnly},
      {"box-none", PointerEventsMode::BoxNone},
  };

  const auto it = pointerEventsMap.find(keyword);
  if (it == pointerEventsMap.end()) {
    return;
  }

  propsBuilder->setPointerEvents(it->second);
}

void addIsolationToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(ISOLATION)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSKeyword>(storage);
  const auto keyword = cssValue.toString();
  static const std::unordered_map<std::string, Isolation> isolationMap = {
      {"auto", Isolation::Auto},
      {"isolate", Isolation::Isolate},
  };

  const auto it = isolationMap.find(keyword);
  if (it == isolationMap.end()) {
    return;
  }

  propsBuilder->setIsolation(it->second);
}

void addCursorToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(CURSOR)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSKeyword>(storage);
  const auto cursor = cssValue.toString();

  static const std::unordered_map<std::string, Cursor> cursorMap = {
      {"auto", Cursor::Auto},
      {"alias", Cursor::Alias},
      {"all-scroll", Cursor::AllScroll},
      {"cell", Cursor::Cell},
      {"col-resize", Cursor::ColResize},
      {"context-menu", Cursor::ContextMenu},
      {"copy", Cursor::Copy},
      {"crosshair", Cursor::Crosshair},
      {"default", Cursor::Default},
      {"e-resize", Cursor::EResize},
      {"ew-resize", Cursor::EWResize},
      {"grab", Cursor::Grab},
      {"grabbing", Cursor::Grabbing},
      {"help", Cursor::Help},
      {"move", Cursor::Move},
      {"ne-resize", Cursor::NEResize},
      {"nesw-resize", Cursor::NESWResize},
      {"n-resize", Cursor::NResize},
      {"ns-resize", Cursor::NSResize},
      {"nw-resize", Cursor::NWResize},
      {"nwse-resize", Cursor::NWSEResize},
      {"no-drop", Cursor::NoDrop},
      {"none", Cursor::None},
      {"not-allowed", Cursor::NotAllowed},
      {"pointer", Cursor::Pointer},
      {"progress", Cursor::Progress},
      {"row-resize", Cursor::RowResize},
      {"s-resize", Cursor::SResize},
      {"se-resize", Cursor::SEResize},
      {"sw-resize", Cursor::SWResize},
      {"text", Cursor::Text},
      {"url", Cursor::Url},
      {"w-resize", Cursor::WResize},
      {"wait", Cursor::Wait},
      {"zoom-in", Cursor::ZoomIn},
      {"zoom-out", Cursor::ZoomOut},
  };

  const auto it = cursorMap.find(cursor);
  if (it == cursorMap.end()) {
    return;
  }

  propsBuilder->setCursor(it->second);
}

void addBoxShadowToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSBoxShadow> &value) {
  if (shouldSkipNonLayoutProp(BOX_SHADOW)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSBoxShadow>(storage);
  SharedColor color = SharedColor(parseCSSColor(cssValue.color));
  BoxShadow boxShadow = BoxShadow{
      .offsetX = static_cast<Float>(cssValue.offsetX.value),
      .offsetY = static_cast<Float>(cssValue.offsetY.value),
      .blurRadius = static_cast<Float>(cssValue.blurRadius.value),
      .spreadDistance = static_cast<Float>(cssValue.spreadDistance.value),
      .color = color,
      .inset = cssValue.inset.has_value() ? cssValue.inset.value().value : false,
  };
  updatePropOrAdd<std::vector<BoxShadow>>(
      propsBuilder,
      BOX_SHADOW,
      [&](auto &boxShadows) { boxShadows.push_back(boxShadow); },
      [&]() {
        std::vector<BoxShadow> boxShadowProp = std::vector<BoxShadow>{boxShadow};
        propsBuilder->setBoxShadow(boxShadowProp);
      });
}

void addMixBlendModeToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  if (shouldSkipNonLayoutProp(MIX_BLEND_MODE)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSKeyword>(storage);
  const auto mixBlend = cssValue.toString();

  static const std::unordered_map<std::string, BlendMode> mixBlendModeMap = {
      {"normal", BlendMode::Normal},
      {"multiply", BlendMode::Multiply},
      {"screen", BlendMode::Screen},
      {"overlay", BlendMode::Overlay},
      {"darken", BlendMode::Darken},
      {"lighten", BlendMode::Lighten},
      {"color-dodge", BlendMode::ColorDodge},
      {"color-burn", BlendMode::ColorBurn},
      {"hard-light", BlendMode::HardLight},
      {"soft-light", BlendMode::SoftLight},
      {"difference", BlendMode::Difference},
      {"exclusion", BlendMode::Exclusion},
      {"hue", BlendMode::Hue},
      {"saturation", BlendMode::Saturation},
      {"color", BlendMode::Color},
      {"luminosity", BlendMode::Luminosity},
  };

  const auto it = mixBlendModeMap.find(mixBlend);
  if (it == mixBlendModeMap.end()) {
    return;
  }

  propsBuilder->setMixBlendMode(it->second);
}

void addBottomToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  addPositionEdge(propsBuilder, value, "bottom");
}

void addTopToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  addPositionEdge(propsBuilder, value, "top");
}

void addLeftToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  addPositionEdge(propsBuilder, value, "left");
}

void addRightToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  addPositionEdge(propsBuilder, value, "right");
}

void addStartToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  addPositionEdge(propsBuilder, value, "start");
}

void addEndToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {
  addPositionEdge(propsBuilder, value, "end");
}

void addTransformOriginXToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength> &value) {
  if (shouldSkipNonLayoutProp(TRANSFORM_ORIGIN)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssLength = std::get<CSSLength>(storage);
  addTransformOriginAxis(propsBuilder, cssLength, "x");
}

void addTransformOriginYToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength> &value) {
  const auto &storage = value.getStorageRef();
  const auto &cssLength = std::get<CSSLength>(storage);
  addTransformOriginAxis(propsBuilder, cssLength, "y");
}

void addTransformOriginZToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  const auto &storage = value.getStorageRef();
  const auto &cssDouble = std::get<CSSDouble>(storage);
  addTransformOriginZ(propsBuilder, cssDouble.value);
}

void addShadowColorToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSColor> &value) {
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSColor>(storage);
  auto color = parseCSSColor(cssValue);
  propsBuilder->setShadowColor(SharedColor(color));
}

void addShadowOffsetWidthToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSDouble>(storage);
  addShadowOffsetAxis(propsBuilder, cssValue, "width");
}

void addShadowOffsetHeightToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSDouble>(storage);
  addShadowOffsetAxis(propsBuilder, cssValue, "height");
}

void addShadowRadiusToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  if (shouldSkipNonLayoutProp(SHADOW_RADIUS)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSDouble>(storage);
  propsBuilder->setShadowRadius(cssValue.value);
}

void addShadowOpacityToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  if (shouldSkipNonLayoutProp(SHADOW_OPACITY)) {
    return;
  }
  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSDouble>(storage);
  propsBuilder->setShadowOpacity(cssValue.value);
}

} // namespace reanimated::css
