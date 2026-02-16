#pragma once

#include <reanimated/CSS/utils/interpolatorPropsBuilderCallbacks.h>
#include <reanimated/CSS/utils/propsLayoutFilter.h>

#include <react/renderer/graphics/Transform.h>

#include <memory>
#include <string>
#include <type_traits>
#include <variant>
#include <vector>

namespace reanimated::css::detail {

using namespace facebook::react;

inline int32_t parseCSSColor(CSSColor color) {
  if (color.colorType == CSSColorType::Rgba) {
    auto &channels = color.channels;
    return (channels[3] << 24) | (channels[0] << 16) | (channels[1] << 8) | channels[2];
  }

  return 0;
}

inline yoga::Align strToYogaAlign(const std::string &name) {
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

inline yoga::Style::SizeLength strToYogaSizeLength(const std::string &keyword) {
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

template <typename T, typename PropNameT, typename UpdateFn, typename AddFn>
inline void updatePropOrAdd(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    PropNameT propName,
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

inline void addFilter(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    FilterFunction filterFunction) {
  if (shouldSkipNonLayoutProp(FILTER)) {
    return;
  }

  updatePropOrAdd<std::vector<FilterFunction>>(
      propsBuilder,
      FILTER,
      [&](auto &filters) { filters.push_back(filterFunction); },
      [&]() {
        std::vector<FilterFunction> filters{filterFunction};
        propsBuilder->setFilter(filters);
      });
}

inline void addTransform(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    Transform transform) {
  if (shouldSkipNonLayoutProp(TRANSFORM)) {
    return;
  }

  updatePropOrAdd<Transform>(
      propsBuilder,
      TRANSFORM,
      [&](Transform &existingTransform) { existingTransform = existingTransform * transform; },
      [&]() { propsBuilder->setTransform(transform); });
}

inline ValueUnit cssLengthToValueUnit(const CSSLength &cssLength) {
  const float value =
      cssLength.isRelative ? static_cast<float>(cssLength.value * 100) : static_cast<float>(cssLength.value);
  return ValueUnit(value, cssLength.isRelative ? UnitType::Percent : UnitType::Point);
}

inline yoga::StyleLength cssLengthToStyleLength(const CSSLength &cssValue) {
  if (cssValue.isRelative) {
    return yoga::StyleLength::percent(cssValue.value * 100);
  }

  return yoga::StyleLength::points(cssValue.value);
}

inline yoga::Style::SizeLength cssLengthToSizeLength(const CSSLength &cssValue) {
  if (cssValue.isRelative) {
    return yoga::Style::SizeLength::percent(cssValue.value * 100);
  }

  return yoga::Style::SizeLength::points(cssValue.value);
}

inline void addTransformOriginAxis(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSLength &cssLength,
    const std::string &axis) {
  if (shouldSkipNonLayoutProp(TRANSFORM_ORIGIN)) {
    return;
  }

  const auto valueUnit = cssLengthToValueUnit(cssLength);

  updatePropOrAdd<TransformOrigin>(
      propsBuilder,
      TRANSFORM_ORIGIN,
      [&](auto &transformOrigin) {
        if (axis == "x") {
          transformOrigin.xy[0] = valueUnit;
        } else if (axis == "y") {
          transformOrigin.xy[1] = valueUnit;
        }
      },
      [&]() {
        TransformOrigin transformOrigin{};
        if (axis == "x") {
          transformOrigin.xy[0] = valueUnit;
        } else if (axis == "y") {
          transformOrigin.xy[1] = valueUnit;
        }
        propsBuilder->setTransformOrigin(transformOrigin);
      });
}

inline void addShadowOffsetAxis(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSDouble &cssDouble,
    const std::string &axis) {
  if (shouldSkipNonLayoutProp(SHADOW_OFFSET)) {
    return;
  }

  updatePropOrAdd<facebook::react::Size>(
      propsBuilder,
      SHADOW_OFFSET,
      [&](auto &shadowOffset) {
        if (axis == "width") {
          shadowOffset.width = cssDouble.value;
        } else if (axis == "height") {
          shadowOffset.height = cssDouble.value;
        }
      },
      [&]() {
        facebook::react::Size size{};
        if (axis == "width") {
          size.width = cssDouble.value;
        } else if (axis == "height") {
          size.height = cssDouble.value;
        }

        propsBuilder->setShadowOffset(size);
      });
}

inline void addTransformOriginZ(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    double zValue) {
  if (shouldSkipNonLayoutProp(TRANSFORM_ORIGIN)) {
    return;
  }

  updatePropOrAdd<TransformOrigin>(
      propsBuilder,
      TRANSFORM_ORIGIN,
      [&](auto &transformOrigin) { transformOrigin.z = static_cast<float>(zValue); },
      [&]() {
        TransformOrigin transformOrigin{};
        transformOrigin.z = static_cast<float>(zValue);
        propsBuilder->setTransformOrigin(transformOrigin);
      });
}

inline void updateCascadedRectangleEdges(
    CascadedRectangleEdges<yoga::StyleLength> &edges,
    yoga::StyleLength value,
    const std::string &edgeName) {
  auto nameHash = RAW_PROPS_KEY_HASH(edgeName);
  switch (nameHash) {
    case RAW_PROPS_KEY_HASH("all"): {
      edges.all = value;
      break;
    }

    case RAW_PROPS_KEY_HASH("left"): {
      edges.left = value;
      break;
    }

    case RAW_PROPS_KEY_HASH("right"): {
      edges.right = value;
      break;
    }

    case RAW_PROPS_KEY_HASH("top"): {
      edges.top = value;
      break;
    }

    case RAW_PROPS_KEY_HASH("bottom"): {
      edges.bottom = value;
      break;
    }

    case RAW_PROPS_KEY_HASH("start"): {
      edges.start = value;
      break;
    }

    case RAW_PROPS_KEY_HASH("end"): {
      edges.end = value;
      break;
    }

    case RAW_PROPS_KEY_HASH("horizontal"): {
      edges.horizontal = value;
      break;
    }

    case RAW_PROPS_KEY_HASH("vertical"): {
      edges.vertical = value;
      break;
    }

    case RAW_PROPS_KEY_HASH("block"): {
      edges.vertical = value;
      break;
    }

    case RAW_PROPS_KEY_HASH("blockStart"): {
      edges.vertical = value;
      break;
    }

    case RAW_PROPS_KEY_HASH("blockEnd"): {
      edges.vertical = value;
      break;
    }
  }
}

inline void addPositionEdge(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value,
    const std::string &edgeName) {
  if (shouldSkipNonLayoutProp(POSITION)) {
    return;
  }

  const auto &storage = value.getStorageRef();
  std::visit(
      [&](const auto &active_value) {
        using T = std::decay_t<decltype(active_value)>;

        if constexpr (std::is_same_v<T, CSSLength>) {
          const CSSLength &cssValue = active_value;
          const auto yogaStyleLength = cssLengthToStyleLength(cssValue);
          updatePropOrAdd<CascadedRectangleEdges<yoga::StyleLength>>(
              propsBuilder,
              POSITION,
              [&](auto &position) { updateCascadedRectangleEdges(position, yogaStyleLength, edgeName); },
              [&]() {
                CascadedRectangleEdges<yoga::StyleLength> position{};
                updateCascadedRectangleEdges(position, yogaStyleLength, edgeName);
                propsBuilder->setPosition(position);
              });

        } else if constexpr (std::is_same_v<T, CSSKeyword>) {
          const CSSKeyword &cssValue = active_value;
          const auto keyword = cssValue.toString();

          if (keyword == "auto") {
            updatePropOrAdd<CascadedRectangleEdges<yoga::StyleLength>>(
                propsBuilder,
                POSITION,
                [&](auto &position) { updateCascadedRectangleEdges(position, yoga::StyleLength::ofAuto(), edgeName); },
                [&]() {
                  CascadedRectangleEdges<yoga::StyleLength> position{};
                  updateCascadedRectangleEdges(position, yoga::StyleLength::ofAuto(), edgeName);
                  propsBuilder->setPosition(position);
                });
          }
        }
      },
      storage);
}

inline void addMargin(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value,
    const std::string &marginPropName) {
  if (shouldSkipNonLayoutProp(MARGIN)) {
    return;
  }

  const auto &storage = value.getStorageRef();

  std::visit(
      [&](const auto &active_value) {
        using T = std::decay_t<decltype(active_value)>;

        if constexpr (std::is_same_v<T, CSSLength>) {
          const CSSLength &cssValue = active_value;
          const auto yogaStyleLength = cssLengthToStyleLength(cssValue);
          updatePropOrAdd<CascadedRectangleEdges<yoga::StyleLength>>(
              propsBuilder,
              MARGIN,
              [&](auto &margin) { updateCascadedRectangleEdges(margin, yogaStyleLength, marginPropName); },
              [&]() {
                CascadedRectangleEdges<yoga::StyleLength> margin{};
                updateCascadedRectangleEdges(margin, yogaStyleLength, marginPropName);
                propsBuilder->setMargin(margin);
              });

        } else if constexpr (std::is_same_v<T, CSSKeyword>) {
          const CSSKeyword &cssValue = active_value;
          if (cssValue.toString() != "auto") {
            return;
          }

          const auto yogaStyleLength = yoga::StyleLength::ofAuto();
          updatePropOrAdd<CascadedRectangleEdges<yoga::StyleLength>>(
              propsBuilder,
              MARGIN,
              [&](auto &margin) { updateCascadedRectangleEdges(margin, yogaStyleLength, marginPropName); },
              [&]() {
                CascadedRectangleEdges<yoga::StyleLength> margin{};
                updateCascadedRectangleEdges(margin, yogaStyleLength, marginPropName);
                propsBuilder->setMargin(margin);
              });
        }
      },
      storage);
}

inline void addPadding(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength, CSSKeyword> &value,
    const std::string &paddingPropName) {
  if (shouldSkipNonLayoutProp(PADDING)) {
    return;
  }

  const auto &storage = value.getStorageRef();

  std::visit(
      [&](const auto &active_value) {
        using T = std::decay_t<decltype(active_value)>;

        if constexpr (std::is_same_v<T, CSSLength>) {
          const CSSLength &cssValue = active_value;
          const auto yogaStyleLength = cssLengthToStyleLength(cssValue);
          updatePropOrAdd<CascadedRectangleEdges<yoga::StyleLength>>(
              propsBuilder,
              PADDING,
              [&](auto &padding) { updateCascadedRectangleEdges(padding, yogaStyleLength, paddingPropName); },
              [&]() {
                CascadedRectangleEdges<yoga::StyleLength> padding{};
                updateCascadedRectangleEdges(padding, yogaStyleLength, paddingPropName);
                propsBuilder->setPadding(padding);
              });

        } else if constexpr (std::is_same_v<T, CSSKeyword>) {
          const CSSKeyword &cssValue = active_value;
          if (cssValue.toString() != "auto") {
            return;
          }

          const auto yogaStyleLength = yoga::StyleLength::ofAuto();
          updatePropOrAdd<CascadedRectangleEdges<yoga::StyleLength>>(
              propsBuilder,
              PADDING,
              [&](auto &padding) { updateCascadedRectangleEdges(padding, yogaStyleLength, paddingPropName); },
              [&]() {
                CascadedRectangleEdges<yoga::StyleLength> padding{};
                updateCascadedRectangleEdges(padding, yogaStyleLength, paddingPropName);
                propsBuilder->setPadding(padding);
              });
        }
      },
      storage);
}

inline void addBorderWidth(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSDouble> &value,
    const std::string &borderWidthPropName) {
  if (shouldSkipNonLayoutProp(BORDER_WIDTH)) {
    return;
  }

  const auto &storage = value.getStorageRef();
  const auto &cssValue = std::get<CSSDouble>(storage);
  updatePropOrAdd<CascadedRectangleEdges<yoga::StyleLength>>(
      propsBuilder,
      BORDER_WIDTH,
      [&](auto &borderWidth) {
        updateCascadedRectangleEdges(borderWidth, yoga::StyleLength::points(cssValue.value), borderWidthPropName);
      },
      [&]() {
        CascadedRectangleEdges<yoga::StyleLength> borderWidth{};
        updateCascadedRectangleEdges(borderWidth, yoga::StyleLength::points(cssValue.value), borderWidthPropName);
        propsBuilder->setBorderWidth(borderWidth);
      });
}

inline void addCascadedBorderRadiiToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSLength> &value,
    const std::string &borderRadiiPropName) {
  if (shouldSkipNonLayoutProp(BORDER_RADII)) {
    return;
  }

  const auto &storage = value.getStorageRef();
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

inline void addBorderColor(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const CSSValueVariant<CSSColor> &value,
    const std::string &borderColorPropName) {
  if (shouldSkipNonLayoutProp(BORDER_COLOR)) {
    return;
  }

  const auto &storage = value.getStorageRef();
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

} // namespace reanimated::css::detail
