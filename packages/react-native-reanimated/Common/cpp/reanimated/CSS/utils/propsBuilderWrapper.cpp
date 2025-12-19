#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/utils/propsBuilderWrapper.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <react/renderer/animationbackend/AnimatedPropsBuilder.h>
#include <react/renderer/animationbackend/AnimationBackend.h>

#include <folly/json.h>
#include <memory>

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

void addFilter(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    FilterFunction filterFunction) {
  bool isFound = false;
  for (auto &prop : propsBuilder->props) {
    if (prop->propName != FILTER) {
      continue;
    }

    auto *filterProp = dynamic_cast<AnimatedProp<std::vector<FilterFunction>> *>(prop.get());

    if (!filterProp) {
      continue;
    }

    filterProp->value.push_back(filterFunction);

    isFound = true;
    break;
  }

  if (!isFound) {
    std::vector<FilterFunction> filters{filterFunction};
    propsBuilder->setFilter(filters);
  }
}

void addTransform(const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder, Transform transform) {
  bool isFound = false;
  for (auto &prop : propsBuilder->props) {
    if (prop->propName != TRANSFORM) {
      continue;
    }

    auto *transformProp = dynamic_cast<AnimatedProp<Transform> *>(prop.get());

    if (!transformProp) {
      continue;
    }

    transformProp->value = (transformProp->value) * transform;

    isFound = true;
    break;
  }

  if (!isFound) {
    propsBuilder->setTransform(transform);
  }
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
          bool isFound = false;

          for (auto &prop : propsBuilder->props) {
            if (prop->propName != MARGIN) {
              continue;
            }
            auto *marginProp = dynamic_cast<AnimatedProp<CascadedRectangleEdges<yoga::StyleLength>> *>(prop.get());

            if (!marginProp) {
              continue;
            }

            updateCascadedRectangleEdges(marginProp->value, cssValue.value, marginPropName, yogaStyleLength);
            isFound = true;
            break;
          }

          if (!isFound) {
            CascadedRectangleEdges<yoga::StyleLength> margin{};
            updateCascadedRectangleEdges(margin, cssValue.value, marginPropName, yogaStyleLength);
            propsBuilder->setMargin(margin);
          }

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
          bool isFound = false;

          for (auto &prop : propsBuilder->props) {
            if (prop->propName != PADDING) {
              continue;
            }
            auto *paddingProp = dynamic_cast<AnimatedProp<CascadedRectangleEdges<yoga::StyleLength>> *>(prop.get());

            if (!paddingProp) {
              continue;
            }

            updateCascadedRectangleEdges(paddingProp->value, cssValue.value, paddingPropName, yogaStyleLength);
            isFound = true;
            break;
          }

          if (!isFound) {
            CascadedRectangleEdges<yoga::StyleLength> padding{};
            updateCascadedRectangleEdges(padding, cssValue.value, paddingPropName, yogaStyleLength);
            propsBuilder->setPadding(padding);
          }

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
  bool isFound = false;

  for (auto &prop : propsBuilder->props) {
    if (prop->propName != BORDER_WIDTH) {
      continue;
    }
    auto *borderWidthProp = dynamic_cast<AnimatedProp<CascadedRectangleEdges<yoga::StyleLength>> *>(prop.get());

    if (!borderWidthProp) {
      continue;
    }

    updateCascadedRectangleEdges(
        borderWidthProp->value, cssValue.value, borderWidthPropName, yoga::StyleLength::points);
    isFound = true;
    break;
  }

  if (!isFound) {
    CascadedRectangleEdges<yoga::StyleLength> borderWidth{};
    updateCascadedRectangleEdges(borderWidth, cssValue.value, borderWidthPropName, yoga::StyleLength::points);
    propsBuilder->setBorderWidth(borderWidth);
  }
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

  bool isFound = false;
  for (auto &prop : propsBuilder->props) {
    if (prop->propName != BORDER_RADII) {
      continue;
    }
    auto *borderProp = dynamic_cast<AnimatedProp<CascadedBorderRadii> *>(prop.get());

    if (!borderProp) {
      continue;
    }

    updateBordeRadii(borderProp->value);
    isFound = true;
    break;
  }

  if (!isFound) {
    CascadedBorderRadii borderRadii{};
    updateBordeRadii(borderRadii);
    propsBuilder->setBorderRadii(borderRadii);
  }
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

  bool isFound = false;
  for (auto &prop : propsBuilder->props) {
    if (prop->propName != BORDER_COLOR) {
      continue;
    }
    auto *borderColorProp = dynamic_cast<AnimatedProp<CascadedBorderColors> *>(prop.get());

    if (!borderColorProp) {
      continue;
    }

    updateBorderColor(borderColorProp->value);
    isFound = true;
    break;
  }

  if (!isFound) {
    CascadedBorderColors borderColor{};
    updateBorderColor(borderColor);
    propsBuilder->setBorderColor(borderColor);
  }
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
  //    transformMatrix->
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
  OutlineStyle outlineStyle;

  auto outlineStyleStr = cssValue.toString();

  if (outlineStyleStr == "solid") {
    outlineStyle = OutlineStyle::Solid;
  } else if (outlineStyleStr == "dotted") {
    outlineStyle = OutlineStyle::Dotted;
  } else if (outlineStyleStr == "dashed") {
    outlineStyle = OutlineStyle::Dashed;
  } else {
    return;
  }

  propsBuilder->setOutlineStyle(outlineStyle);
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
  //    propsBuilder->setF
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
  if (boxSizing == "border-box") {
    propsBuilder->setBoxSizing(yoga::BoxSizing::BorderBox);
  } else if (boxSizing == "content-box") {
    propsBuilder->setBoxSizing(yoga::BoxSizing::ContentBox);
  }
}

void addDisplayToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDisplay> &value) {
  const auto &storage = value.getStorage();
  const auto &cssValue = std::get<CSSDisplay>(storage);
  const auto display = cssValue.toString();

  if (display == "flex") {
    propsBuilder->setDisplay(yoga::Display::Flex);
  } else if (display == "none") {
    propsBuilder->setDisplay(yoga::Display::None);
  } else if (display == "contents") {
    propsBuilder->setDisplay(yoga::Display::Contents);
  }
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

  if (flexDirection == "column") {
    propsBuilder->setFlexDirection(yoga::FlexDirection::Column);
  } else if (flexDirection == "column-reverse") {
    propsBuilder->setFlexDirection(yoga::FlexDirection::ColumnReverse);
  } else if (flexDirection == "row") {
    propsBuilder->setFlexDirection(yoga::FlexDirection::Row);
  } else if (flexDirection == "row-reverse") {
    propsBuilder->setFlexDirection(yoga::FlexDirection::RowReverse);
  }
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

  if (flexWrap == "no-wrap") {
    propsBuilder->setFlexWrap(yoga::Wrap::NoWrap);
  } else if (flexWrap == "wrap") {
    propsBuilder->setFlexWrap(yoga::Wrap::Wrap);
  } else if (flexWrap == "wrap-reverse") {
    propsBuilder->setFlexWrap(yoga::Wrap::WrapReverse);
  }
}

void addJustifyContentToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSKeyword> &value) {
  const auto &storage = value.getStorage();
  const auto &cssValue = std::get<CSSKeyword>(storage);
  const auto justifyContent = cssValue.toString();

  if (justifyContent == "flex-start") {
    propsBuilder->setJustifyContent(yoga::Justify::FlexStart);
  } else if (justifyContent == "center") {
    propsBuilder->setJustifyContent(yoga::Justify::Center);
  } else if (justifyContent == "flex-end") {
    propsBuilder->setJustifyContent(yoga::Justify::FlexEnd);
  } else if (justifyContent == "space-between") {
    propsBuilder->setJustifyContent(yoga::Justify::SpaceBetween);
  } else if (justifyContent == "space-around") {
    propsBuilder->setJustifyContent(yoga::Justify::SpaceAround);
  } else if (justifyContent == "space-evenly") {
    propsBuilder->setJustifyContent(yoga::Justify::SpaceEvenly);
  }
}

void animationMutationsFromDynamic(AnimationMutations &mutations, UpdatesBatch &updatesBatch) {
  for (auto &[node, dynamic] : updatesBatch) {
    AnimatedPropsBuilder builder;
    builder.storeDynamic(dynamic);
    mutations.push_back(AnimationMutation{node->getTag(), &node->getFamily(), builder.get()});
  }
}

} // namespace reanimated::css
