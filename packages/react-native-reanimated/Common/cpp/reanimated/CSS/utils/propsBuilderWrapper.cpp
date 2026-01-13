#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/utils/propsBuilderWrapper.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <react/renderer/animationbackend/AnimatedPropsBuilder.h>
#include <react/renderer/animationbackend/AnimationBackend.h>

#include <folly/json.h>
#include <memory>
#include <unordered_map>

using namespace facebook::react;

namespace reanimated::css {

namespace {

int32_t parseCSSColor(CSSColor color) {
  if (color.colorType == CSSColorType::Rgba) {
    auto &channels = color.channels;
    return (channels[3] << 24) | (channels[0] << 16) | (channels[1] << 8) | channels[2];
  }

  return 0;
}

yoga::Align strToYogaAlign(std::string name) {
  if (name == "auto") {
    return yoga::Align::Auto;
  }

  if (name == "flex-start") {
    return yoga::Align::FlexStart;
  }

  if (name == "center") {
    return yoga::Align::Center;
  }

  if (name == "flex-end") {
    return yoga::Align::FlexEnd;
  }

  if (name == "stretch") {
    return yoga::Align::Stretch;
  }

  if (name == "baseline") {
    return yoga::Align::Baseline;
  }

  if (name == "space-between") {
    return yoga::Align::SpaceBetween;
  }

  if (name == "space-around") {
    return yoga::Align::SpaceAround;
  }

  if (name == "space-evenly") {
    return yoga::Align::SpaceEvenly;
  }

  return yoga::Align::Auto;
}

yoga::Style::SizeLength strToYogaSizeLength(std::string keyword) {
  if (keyword == "auto") {
    return yoga::Style::SizeLength::ofAuto();
  } else if (keyword == "stretch") {
    return yoga::Style::SizeLength::ofStretch();
  } else if (keyword == "fit-content") {
    return yoga::Style::SizeLength::ofFitContent();
  } else if (keyword == "max-content") {
    return yoga::Style::SizeLength::ofMaxContent();
  }

  return yoga::Style::SizeLength::undefined();
}

template <typename T, typename PropName, typename UpdateFn, typename AddFn>
void updatePropOrAdd(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    PropName propName,
    UpdateFn updateExisting,
    AddFn addNew) {
  for (auto &prop : propsBuilder->props) {
    if (prop->propName != propName) {
      continue;
    }

    auto *typedProp = dynamic_cast<AnimatedProp<T> *>(prop.get());
    if (!typedProp) {
      continue;
    }

    updateExisting(typedProp->value);
    return;
  }

  addNew();
}

void addFilter(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    FilterFunction filterFunction) {
  updatePropOrAdd<std::vector<FilterFunction>>(
      propsBuilder,
      FILTER,
      [&](auto &filters) { filters.push_back(filterFunction); },
      [&]() {
        std::vector<FilterFunction> filters{filterFunction};
        propsBuilder->setFilter(filters);
      });
}

void addTransform(const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder, Transform transform) {
  updatePropOrAdd<Transform>(
      propsBuilder,
      TRANSFORM,
      [&](auto &existingTransform) { existingTransform = existingTransform * transform; },
      [&]() { propsBuilder->setTransform(transform); });
}

void updateCascadedRectangleEdges(
    CascadedRectangleEdges<yoga::StyleLength> &edges,
    float value,
    std::string edgeName,
    std::function<yoga::StyleLength(float)> yogaStyleLength) {
  auto nameHash = RAW_PROPS_KEY_HASH(edgeName);
  switch (nameHash) {
    case RAW_PROPS_KEY_HASH("all"): {
      edges.all = yogaStyleLength(value);
      break;
    }

    case RAW_PROPS_KEY_HASH("left"): {
      edges.left = yogaStyleLength(value);
      break;
    }

    case RAW_PROPS_KEY_HASH("right"): {
      edges.right = yogaStyleLength(value);
      break;
    }

    case RAW_PROPS_KEY_HASH("top"): {
      edges.top = yogaStyleLength(value);
      break;
    }

    case RAW_PROPS_KEY_HASH("bottom"): {
      edges.bottom = yogaStyleLength(value);
      break;
    }

    case RAW_PROPS_KEY_HASH("start"): {
      edges.start = yogaStyleLength(value);
      break;
    }

    case RAW_PROPS_KEY_HASH("end"): {
      edges.end = yogaStyleLength(value);
      break;
    }

    case RAW_PROPS_KEY_HASH("horizontal"): {
      edges.horizontal = yogaStyleLength(value);
      break;
    }

    case RAW_PROPS_KEY_HASH("vertical"): {
      edges.vertical = yogaStyleLength(value);
      break;
    }

    case RAW_PROPS_KEY_HASH("block"): {
      edges.vertical = yogaStyleLength(value);
      break;
    }

    case RAW_PROPS_KEY_HASH("blockStart"): {
      edges.vertical = yogaStyleLength(value);
      break;
    }

    case RAW_PROPS_KEY_HASH("blockEnd"): {
      edges.vertical = yogaStyleLength(value);
      break;
    }
  }
}

void addMargin(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value,
    std::string marginPropName) {
  const auto &storage = value.getStorage();

  std::visit(
      [&](const auto &active_value) {
        using T = std::decay_t<decltype(active_value)>;

        if constexpr (std::is_same_v<T, CSSLength>) {
          const CSSLength &cssValue = active_value;
          const auto yogaStyleLength = cssValue.isRelative ? yoga::StyleLength::percent : yoga::StyleLength::points;
          updatePropOrAdd<CascadedRectangleEdges<yoga::StyleLength>>(
              propsBuilder,
              MARGIN,
              [&](auto &margin) {
                updateCascadedRectangleEdges(margin, cssValue.value, marginPropName, yogaStyleLength);
              },
              [&]() {
                CascadedRectangleEdges<yoga::StyleLength> margin{};
                updateCascadedRectangleEdges(margin, cssValue.value, marginPropName, yogaStyleLength);
                propsBuilder->setMargin(margin);
              });

        } else if constexpr (std::is_same_v<T, CSSKeyword>) {
          // TODO: Handle this case
        }
      },
      storage);
}

void addPadding(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value,
    std::string paddingPropName) {
  const auto &storage = value.getStorage();

  std::visit(
      [&](const auto &active_value) {
        using T = std::decay_t<decltype(active_value)>;

        if constexpr (std::is_same_v<T, CSSLength>) {
          const CSSLength &cssValue = active_value;
          const auto yogaStyleLength = cssValue.isRelative ? yoga::StyleLength::percent : yoga::StyleLength::points;
          updatePropOrAdd<CascadedRectangleEdges<yoga::StyleLength>>(
              propsBuilder,
              PADDING,
              [&](auto &padding) {
                updateCascadedRectangleEdges(padding, cssValue.value, paddingPropName, yogaStyleLength);
              },
              [&]() {
                CascadedRectangleEdges<yoga::StyleLength> padding{};
                updateCascadedRectangleEdges(padding, cssValue.value, paddingPropName, yogaStyleLength);
                propsBuilder->setPadding(padding);
              });

        } else if constexpr (std::is_same_v<T, CSSKeyword>) {
          // TODO: Handle this case
        }
      },
      storage);
}

void addBorderWidth(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value,
    std::string borderWidthPropName) {
  const auto &storage = value.getStorage();
  const auto &cssValue = std::get<CSSDouble>(storage);
  updatePropOrAdd<CascadedRectangleEdges<yoga::StyleLength>>(
      propsBuilder,
      BORDER_WIDTH,
      [&](auto &borderWidth) {
        updateCascadedRectangleEdges(borderWidth, cssValue.value, borderWidthPropName, yoga::StyleLength::points);
      },
      [&]() {
        CascadedRectangleEdges<yoga::StyleLength> borderWidth{};
        updateCascadedRectangleEdges(borderWidth, cssValue.value, borderWidthPropName, yoga::StyleLength::points);
        propsBuilder->setBorderWidth(borderWidth);
      });
}

void addCascadedBorderRadiiToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength> &value,
    std::string borderRadiiPropName) {
  const auto &storage = value.getStorage();
  const auto &cssValue = std::get<CSSLength>(storage);

  const auto updateBordeRadii = [&](CascadedBorderRadii &borderRadii) {
    auto nameHash = RAW_PROPS_KEY_HASH(borderRadiiPropName);
    switch (nameHash) {
      case RAW_PROPS_KEY_HASH("all"):
        borderRadii.all = {(float)cssValue.value, UnitType::Point};
        break;
      case RAW_PROPS_KEY_HASH("topLeft"):
        borderRadii.topLeft = {(float)cssValue.value, UnitType::Point};
        break;
      case RAW_PROPS_KEY_HASH("topRight"):
        borderRadii.topRight = {(float)cssValue.value, UnitType::Point};
        break;
      case RAW_PROPS_KEY_HASH("bottomLeft"):
        borderRadii.bottomLeft = {(float)cssValue.value, UnitType::Point};
        break;
      case RAW_PROPS_KEY_HASH("bottomRight"):
        borderRadii.bottomRight = {(float)cssValue.value, UnitType::Point};
        break;
      case RAW_PROPS_KEY_HASH("topStart"):
        borderRadii.topStart = {(float)cssValue.value, UnitType::Point};
        break;
      case RAW_PROPS_KEY_HASH("topEnd"):
        borderRadii.topEnd = {(float)cssValue.value, UnitType::Point};
        break;
      case RAW_PROPS_KEY_HASH("bottomStart"):
        borderRadii.bottomStart = {(float)cssValue.value, UnitType::Point};
        break;
      case RAW_PROPS_KEY_HASH("bottomEnd"):
        borderRadii.bottomEnd = {(float)cssValue.value, UnitType::Point};
        break;
      case RAW_PROPS_KEY_HASH("startStart"):
        borderRadii.startStart = {(float)cssValue.value, UnitType::Point};
        break;
      case RAW_PROPS_KEY_HASH("startEnd"):
        borderRadii.startEnd = {(float)cssValue.value, UnitType::Point};
        break;
      case RAW_PROPS_KEY_HASH("endStart"):
        borderRadii.endStart = {(float)cssValue.value, UnitType::Point};
        break;
      case RAW_PROPS_KEY_HASH("endEnd"):
        borderRadii.endEnd = {(float)cssValue.value, UnitType::Point};
        break;
    }
  };

  updatePropOrAdd<CascadedBorderRadii>(
      propsBuilder,
      BORDER_RADII,
      [&](auto &borderRadii) { updateBordeRadii(borderRadii); },
      [&]() {
        CascadedBorderRadii borderRadii{};
        updateBordeRadii(borderRadii);
        propsBuilder->setBorderRadii(borderRadii);
      });
}

void addBorderColor(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSColor> &value,
    std::string borderColorPropName) {
  const auto &storage = value.getStorage();
  const auto &cssColor = std::get<CSSColor>(storage);

  const auto updateBorderColor = [&](CascadedBorderColors &borderColor) {
    auto nameHash = RAW_PROPS_KEY_HASH(borderColorPropName);
    switch (nameHash) {
      case RAW_PROPS_KEY_HASH("all"):
        borderColor.all = SharedColor(parseCSSColor(cssColor));
        break;
      case RAW_PROPS_KEY_HASH("left"):
        borderColor.left = SharedColor(parseCSSColor(cssColor));
        break;
      case RAW_PROPS_KEY_HASH("top"):
        borderColor.top = SharedColor(parseCSSColor(cssColor));
        break;
      case RAW_PROPS_KEY_HASH("right"):
        borderColor.right = SharedColor(parseCSSColor(cssColor));
        break;
      case RAW_PROPS_KEY_HASH("bottom"):
        borderColor.bottom = SharedColor(parseCSSColor(cssColor));
        break;
      case RAW_PROPS_KEY_HASH("start"):
        borderColor.start = SharedColor(parseCSSColor(cssColor));
        break;
      case RAW_PROPS_KEY_HASH("end"):
        borderColor.end = SharedColor(parseCSSColor(cssColor));
        break;
      case RAW_PROPS_KEY_HASH("horizontal"):
        borderColor.horizontal = SharedColor(parseCSSColor(cssColor));
        break;
      case RAW_PROPS_KEY_HASH("vertical"):
        borderColor.vertical = SharedColor(parseCSSColor(cssColor));
        break;
      case RAW_PROPS_KEY_HASH("block"):
        borderColor.block = SharedColor(parseCSSColor(cssColor));
        break;
      case RAW_PROPS_KEY_HASH("blockStart"):
        borderColor.blockStart = SharedColor(parseCSSColor(cssColor));
        break;
      case RAW_PROPS_KEY_HASH("blockEnd"):
        borderColor.blockEnd = SharedColor(parseCSSColor(cssColor));
        break;
    }
  };

  updatePropOrAdd<CascadedBorderColors>(
      propsBuilder,
      BORDER_COLOR,
      [&](auto &borderColor) { updateBorderColor(borderColor); },
      [&]() {
        CascadedBorderColors borderColor{};
        updateBorderColor(borderColor);
        propsBuilder->setBorderColor(borderColor);
      });
}

} // namespace

void addWidthToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {

  const auto &storage = value.getStorage();
  std::visit(
      [&](const auto &active_value) {
        using T = std::decay_t<decltype(active_value)>;

        if constexpr (std::is_same_v<T, CSSLength>) {
          const CSSLength &cssValue = active_value;
          if (cssValue.isRelative) {
            propsBuilder->setWidth(yoga::Style::SizeLength::percent(cssValue.value));
          } else {
            propsBuilder->setWidth(yoga::Style::SizeLength::points(cssValue.value));
          }

        } else if constexpr (std::is_same_v<T, CSSKeyword>) {
          // TODO: Handle this case
        }
      },
      storage);
}

void addHeightToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value) {

  const auto &storage = value.getStorage();
  std::visit(
      [&](const auto &active_value) {
        using T = std::decay_t<decltype(active_value)>;

        if constexpr (std::is_same_v<T, CSSLength>) {
          const CSSLength &cssValue = active_value;
          if (cssValue.isRelative) {
            propsBuilder->setHeight(yoga::Style::SizeLength::percent(cssValue.value));
          } else {
            propsBuilder->setHeight(yoga::Style::SizeLength::points(cssValue.value));
          }

        } else if constexpr (std::is_same_v<T, CSSKeyword>) {
            // TODO: Handle this case
        }
      },
      storage);
}

void addBackgroundColorToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSColor> &value) {

  const auto &storage = value.getStorage();
  const auto &cssValue = std::get<CSSColor>(storage);
  auto color = parseCSSColor(cssValue);
  propsBuilder->setBackgroundColor(SharedColor(color));
}

void addOpacityToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  const auto &storage = value.getStorage();
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
  double blurValue = operation.value.value;
  FilterFunction filterFunction = FilterFunction{FilterType::Blur, std::variant<Float, DropShadowParams>{blurValue}};
  addFilter(propsBuilder, filterFunction);
}

void addBrightnessFilterToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    BrightnessOperation &operation) {
  double brightnessValue = operation.value.value;
  FilterFunction filterFunction =
      FilterFunction{FilterType::Brightness, std::variant<Float, DropShadowParams>{brightnessValue}};
  addFilter(propsBuilder, filterFunction);
}

void addContrastFilterToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    ContrastOperation &operation) {
  double contrastValue = operation.value.value;
  FilterFunction filterFuntion =
      FilterFunction{FilterType::Contrast, std::variant<Float, DropShadowParams>{contrastValue}};
}

void addDropShadowFilterToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    DropShadowOperation &operation) {

  DropShadowParams dropShadowParams = DropShadowParams{
      operation.value.offsetX.value,
      operation.value.offsetY.value,
      operation.value.standardDeviation.value,
      SharedColor(parseCSSColor(operation.value.color))};

  FilterFunction filterFunction =
      FilterFunction{FilterType::DropShadow, std::variant<Float, DropShadowParams>{dropShadowParams}};
  addFilter(propsBuilder, filterFunction);
}

void addGrayscaleFilterToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    GrayscaleOperation &operation) {
  double grayScaleValue = operation.value.value;
  FilterFunction filterFunction =
      FilterFunction{FilterType::Grayscale, std::variant<Float, DropShadowParams>{grayScaleValue}};
  addFilter(propsBuilder, filterFunction);
}

void addHueRotateFilterToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    HueRotateOperation &operation) {
  double hueRotateValue = operation.value.value;
  FilterFunction filterFunction =
      FilterFunction{FilterType::HueRotate, std::variant<Float, DropShadowParams>{hueRotateValue}};
  addFilter(propsBuilder, filterFunction);
}

void addInvertFilterToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    InvertOperation &operation) {
  double invertValue = operation.value.value;
  FilterFunction filterFunction =
      FilterFunction{FilterType::Invert, std::variant<Float, DropShadowParams>{invertValue}};
  addFilter(propsBuilder, filterFunction);
}

void addOpacityFilterToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    OpacityOperation &operation) {
  double opacityValue = operation.value.value;
  FilterFunction filterFunction =
      FilterFunction{FilterType::Opacity, std::variant<Float, DropShadowParams>{opacityValue}};
  addFilter(propsBuilder, filterFunction);
}

void addSaturateFilterToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    SaturateOperation &operation) {
  double saturateValue = operation.value.value;
  FilterFunction filterFunction =
      FilterFunction{FilterType::Saturate, std::variant<Float, DropShadowParams>{saturateValue}};
  addFilter(propsBuilder, filterFunction);
}

void addSepiaFilterToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    SepiaOperation &operation) {
  double sepiaValue = operation.value.value;
  FilterFunction filterFunction = FilterFunction{FilterType::Sepia, std::variant<Float, DropShadowParams>{sepiaValue}};
  addFilter(propsBuilder, filterFunction);
}

void addPerspectiveTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    PerspectiveOperation &operation) {
  double perspectiveValue = operation.value.value;
  Transform t = t.Perspective(perspectiveValue);
  addTransform(propsBuilder, t);
}

void addRotateTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    RotateOperation &operation) {
  double rotateValue = operation.value.value;
  Transform t = t.RotateZ(rotateValue);
  addTransform(propsBuilder, t);
}

void addRotateXTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    RotateXOperation &operation) {
  double rotateValue = operation.value.value;
  Transform t = t.RotateX(rotateValue);
  addTransform(propsBuilder, t);
}

void addRotateYTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    RotateYOperation &operation) {
  double rotateValue = operation.value.value;
  Transform t = t.RotateY(rotateValue);
  addTransform(propsBuilder, t);
}

void addRotateZTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    RotateZOperation &operation) {
  double rotateValue = operation.value.value;
  Transform t = t.RotateZ(rotateValue);
  addTransform(propsBuilder, t);
}

void addScaleTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    ScaleOperation &operation) {
  double scaleValue = operation.value.value;
  Transform t = t.Scale(scaleValue, scaleValue, scaleValue);
  addTransform(propsBuilder, t);
}

void addScaleXTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    ScaleXOperation &operation) {
  double scaleValue = operation.value.value;
  Transform t = t.Scale(scaleValue, 0, 0);
  addTransform(propsBuilder, t);
}

void addScaleYTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    ScaleYOperation &operation) {
  double scaleValue = operation.value.value;
  Transform t = t.Scale(0, scaleValue, 0);
  addTransform(propsBuilder, t);
}

void addTranslateXTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    TranslateXOperation &operation) {
  double translateValue = operation.value.value;
  Transform t = t.Translate(translateValue, 0, 0);
  addTransform(propsBuilder, t);
}

void addTranslateYTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    TranslateYOperation &operation) {
  double translateValue = operation.value.value;
  Transform t = t.Translate(0, translateValue, 0);
  addTransform(propsBuilder, t);
}

void addSkewXTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    SkewXOperation &operation) {
  double skewValue = operation.value.value;
  Transform t = t.Skew(skewValue, 0);
  addTransform(propsBuilder, t);
}

void addSkewYTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    SkewYOperation &operation) {
  double skewValue = operation.value.value;
  Transform t = t.Skew(0, skewValue);
  addTransform(propsBuilder, t);
}

void addMatrixTransformToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    MatrixOperation &operation) {
  TransformMatrix::Shared transformMatrix = operation.toMatrix(true);
  // TODO: implement this
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
  const auto &storage = value.getStorage();
  const auto &cssColor = std::get<CSSColor>(storage);
  propsBuilder->setOutlineColor(SharedColor(parseCSSColor(cssColor)));
}

void addOutlineOffsetToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  const auto &storage = value.getStorage();
  const auto &cssValue = std::get<CSSDouble>(storage);
  propsBuilder->setOutlineOffset(cssValue.value);
}

void addOutlineStyleToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  const auto &storage = value.getStorage();
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
  const auto &storage = value.getStorage();
  const auto &cssValue = std::get<CSSDouble>(storage);
  propsBuilder->setOutlineWidth(cssValue.value);
}

void addFlexToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  const auto &storage = value.getStorage();
  const auto &cssValue = std::get<CSSDouble>(storage);
  // TODO: implement this
}

void addAlignContentToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  const auto &storage = value.getStorage();
  const auto &cssValue = std::get<CSSKeyword>(storage);
  propsBuilder->setAlignContent(strToYogaAlign(cssValue.toString()));
}

void addAlignItemsToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  const auto &storage = value.getStorage();
  const auto &cssValue = std::get<CSSKeyword>(storage);
  propsBuilder->setAlignItems(strToYogaAlign(cssValue.toString()));
}

void addAlignSelfToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  const auto &storage = value.getStorage();
  const auto &cssValue = std::get<CSSKeyword>(storage);
  propsBuilder->setAlignSelf(strToYogaAlign(cssValue.toString()));
}

void addAspectRatioToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble, CSSKeyword> &value) {
  const auto &storage = value.getStorage();

  std::visit(
      [&](const auto &active_value) {
        using T = std::decay_t<decltype(active_value)>;

        if constexpr (std::is_same_v<T, CSSLength>) {
          const CSSDouble &cssValue = active_value;
          propsBuilder->setAspectRatio(yoga::FloatOptional(cssValue.value));
        } else if constexpr (std::is_same_v<T, CSSKeyword>) {
          // TODO: Handle this case
        }
      },
      storage);
}

void addBoxSizingToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  const auto &storage = value.getStorage();
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
  const auto &storage = value.getStorage();
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
  const auto &storage = value.getStorage();

  std::visit(
      [&](const auto &active_value) {
        using T = std::decay_t<decltype(active_value)>;

        if constexpr (std::is_same_v<T, CSSLength>) {
          const CSSLength &cssValue = active_value;
          if (cssValue.isRelative) {
            propsBuilder->setFlexBasis(yoga::Style::SizeLength::percent(cssValue.value));
          } else {
            propsBuilder->setFlexBasis(yoga::Style::SizeLength::points(cssValue.value));
          }
        } else if constexpr (std::is_same_v<T, CSSKeyword>) {
          // TODO: Handle this case
        }
      },
      storage);
}

void addFlexDirectionToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  const auto &storage = value.getStorage();
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
  const auto &storage = value.getStorage();
  const auto &cssValue = std::get<CSSLength>(storage);

  if (cssValue.isRelative) {
    propsBuilder->setRowGap(yoga::StyleLength::percent(cssValue.value));
  } else {
    propsBuilder->setRowGap(yoga::StyleLength::points(cssValue.value));
  }
}

void addColumnGapToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength> &value) {
  const auto &storage = value.getStorage();
  const auto &cssValue = std::get<CSSLength>(storage);

  if (cssValue.isRelative) {
    propsBuilder->setColumnGap(yoga::StyleLength::percent(cssValue.value));
  } else {
    propsBuilder->setColumnGap(yoga::StyleLength::points(cssValue.value));
  }
}

void addFlexGrowToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  const auto &storage = value.getStorage();
  const auto &cssValue = std::get<CSSDouble>(storage);
  propsBuilder->setFlexGrow(yoga::FloatOptional(cssValue.value));
}

void addFlexShrinkToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value) {
  const auto &storage = value.getStorage();
  const auto &cssValue = std::get<CSSDouble>(storage);
  propsBuilder->setFlexShrink(yoga::FloatOptional(cssValue.value));
}

void addFlexWrapToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  const auto &storage = value.getStorage();
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
  const auto &storage = value.getStorage();
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

  const auto &storage = value.getStorage();
  std::visit(
      [&](const auto &active_value) {
        using T = std::decay_t<decltype(active_value)>;

        if constexpr (std::is_same_v<T, CSSLength>) {
          const CSSLength &cssValue = active_value;
          if (cssValue.isRelative) {
            propsBuilder->setMaxWidth(yoga::Style::SizeLength::percent(cssValue.value));
          } else {
            propsBuilder->setMaxWidth(yoga::Style::SizeLength::points(cssValue.value));
          }

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
  const auto &storage = value.getStorage();
  std::visit(
      [&](const auto &active_value) {
        using T = std::decay_t<decltype(active_value)>;

        if constexpr (std::is_same_v<T, CSSLength>) {
          const CSSLength &cssValue = active_value;
          if (cssValue.isRelative) {
            propsBuilder->setMinWidth(yoga::Style::SizeLength::percent(cssValue.value));
          } else {
            propsBuilder->setMinWidth(yoga::Style::SizeLength::points(cssValue.value));
          }

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
  const auto &storage = value.getStorage();
  std::visit(
      [&](const auto &active_value) {
        using T = std::decay_t<decltype(active_value)>;

        if constexpr (std::is_same_v<T, CSSLength>) {
          const CSSLength &cssValue = active_value;
          if (cssValue.isRelative) {
            propsBuilder->setMaxHeight(yoga::Style::SizeLength::percent(cssValue.value));
          } else {
            propsBuilder->setMaxHeight(yoga::Style::SizeLength::points(cssValue.value));
          }

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
  const auto &storage = value.getStorage();
  std::visit(
      [&](const auto &active_value) {
        using T = std::decay_t<decltype(active_value)>;

        if constexpr (std::is_same_v<T, CSSLength>) {
          const CSSLength &cssValue = active_value;
          if (cssValue.isRelative) {
            propsBuilder->setMinHeight(yoga::Style::SizeLength::percent(cssValue.value));
          } else {
            propsBuilder->setMinHeight(yoga::Style::SizeLength::points(cssValue.value));
          }

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
  const auto &storage = value.getStorage();
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
  const auto &storage = value.getStorage();
  const auto &cssValue = std::get<CSSInteger>(storage);
  propsBuilder->setZIndex(cssValue.value);
}

void addDirectionToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  const auto &storage = value.getStorage();
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
  const auto &storage = value.getStorage();
  const auto &cssValue = std::get<CSSKeyword>(storage);
  const auto backfaceVisibility = cssValue.toString();
  // TODO: Check this
}

void addBorderCurveToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  const auto &storage = value.getStorage();
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
  const auto &storage = value.getStorage();
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
    // TODO: Check this
}

void addPointerEventsToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  const auto &storage = value.getStorage();
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
  const auto &storage = value.getStorage();
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
  const auto &storage = value.getStorage();
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
  const auto &storage = value.getStorage();
  const auto &cssValue = std::get<CSSBoxShadow>(storage);
  SharedColor color = SharedColor(parseCSSColor(cssValue.color));
  BoxShadow boxShadow = BoxShadow{
      .offsetX = cssValue.offsetX.value,
      .offsetY = cssValue.offsetY.value,
      .blurRadius = cssValue.blurRadius.value,
      .spreadDistance = cssValue.spreadDistance.value,
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
  const auto &storage = value.getStorage();
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

void animationMutationsFromDynamic(AnimationMutations &mutations, UpdatesBatch &updatesBatch) {
  for (auto &[node, dynamic] : updatesBatch) {
    AnimatedPropsBuilder builder;
    builder.storeDynamic(dynamic);
    mutations.batch.push_back(AnimationMutation{node->getTag(), node->getFamilyShared(), builder.get(), true});
  }
}

} // namespace reanimated::css
