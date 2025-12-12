#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/utils/propsBuilderWrapper.h>
#include <reanimated/Fabric/updates/UpdatesRegistry.h>

#include <react/renderer/animationbackend/AnimatedPropsBuilder.h>
#include <react/renderer/animationbackend/AnimationBackend.h>

#include <folly/json.h>

using namespace facebook::react;

namespace reanimated::css {

namespace {

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

          printf("getCSSLengthKeywordCallback: propName %s, value %f \n", "width", cssValue.value);

        } else if constexpr (std::is_same_v<T, CSSKeyword>) {
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
            propsBuilder->setWidth(yoga::Style::SizeLength::percent(cssValue.value));
          } else {
            propsBuilder->setWidth(yoga::Style::SizeLength::points(cssValue.value));
          }

          printf("getCSSLengthKeywordCallback: propName %s, value %f \n", "width", cssValue.value);

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
  auto color = 0;
  if (cssValue.colorType == CSSColorType::Rgba) {
    auto &channels = cssValue.channels;
    color = (channels[3] << 24) | (channels[0] << 16) | (channels[1] << 8) | channels[2];
  } else {
    color = 0;
  }

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

void animationMutationsFromDynamic(AnimationMutations &mutations, UpdatesBatch &updatesBatch) {
  for (auto &[node, dynamic] : updatesBatch) {
    AnimatedPropsBuilder builder;
    CascadedBorderRadii borderRadii{};
    CascadedRectangleEdges<yoga::StyleLength> margin{};
    CascadedRectangleEdges<yoga::StyleLength> padding{};
    CascadedRectangleEdges<yoga::StyleLength> position{};
    CascadedRectangleEdges<yoga::StyleLength> borderWidth{};
    printf("dynamic: %s \n", folly::toJson(dynamic).c_str());

    for (const auto &pair : dynamic.items()) {
      const auto &name = pair.first.getString();
      auto nameHash = RAW_PROPS_KEY_HASH(name);

      switch (nameHash) {
        case RAW_PROPS_KEY_HASH("opacity"):
          builder.setOpacity(pair.second.asDouble());
          break;

        case RAW_PROPS_KEY_HASH("borderRadius"):
          borderRadii.all = {(float)pair.second.asDouble(), UnitType::Point};
          break;

        case RAW_PROPS_KEY_HASH("borderTopRightRadius"):
          borderRadii.topRight = {(float)pair.second.asDouble(), UnitType::Point};
          break;

        case RAW_PROPS_KEY_HASH("borderTopLeftRadius"):
          borderRadii.topLeft = {(float)pair.second.asDouble(), UnitType::Point};
          break;

        case RAW_PROPS_KEY_HASH("borderBottomRightRadius"):
          borderRadii.bottomRight = {(float)pair.second.asDouble(), UnitType::Point};
          break;

        case RAW_PROPS_KEY_HASH("borderBottomLeftRadius"):
          borderRadii.bottomLeft = {(float)pair.second.asDouble(), UnitType::Point};
          break;

        case RAW_PROPS_KEY_HASH("borderTopStartRadius"):
          borderRadii.topStart = {(float)pair.second.asDouble(), UnitType::Point};
          break;

        case RAW_PROPS_KEY_HASH("borderTopEndRadius"):
          borderRadii.topEnd = {(float)pair.second.asDouble(), UnitType::Point};
          break;

        case RAW_PROPS_KEY_HASH("borderBottomStartRadius"):
          borderRadii.bottomStart = {(float)pair.second.asDouble(), UnitType::Point};
          break;

        case RAW_PROPS_KEY_HASH("borderBottomEndRadius"):
          borderRadii.bottomEnd = {(float)pair.second.asDouble(), UnitType::Point};
          break;

        case RAW_PROPS_KEY_HASH("borderStartStartRadius"):
          borderRadii.startStart = {(float)pair.second.asDouble(), UnitType::Point};
          break;

        case RAW_PROPS_KEY_HASH("borderStartEndRadius"):
          borderRadii.startEnd = {(float)pair.second.asDouble(), UnitType::Point};
          break;

        case RAW_PROPS_KEY_HASH("borderEndStartRadius"):
          borderRadii.endStart = {(float)pair.second.asDouble(), UnitType::Point};
          break;

        case RAW_PROPS_KEY_HASH("borderEndEndRadius"):
          borderRadii.endEnd = {(float)pair.second.asDouble(), UnitType::Point};
          break;

        case RAW_PROPS_KEY_HASH("width"):
          builder.setWidth(yoga::Style::SizeLength::points(pair.second.asDouble()));
          break;

        case RAW_PROPS_KEY_HASH("height"):
          builder.setHeight(yoga::Style::SizeLength::points(pair.second.asDouble()));
          break;

        case RAW_PROPS_KEY_HASH("transform"): {
          Transform t;

          for (int i = 0; i < pair.second.size(); i++) {
            const auto &transformObject = pair.second.at(i);
            for (const auto &transform : transformObject.items()) {
              if (transform.first.asString() == "translateX") {
                t = t * t.Translate(transform.second.asDouble(), 0, 0);
              } else if (transform.first.asString() == "translateY") {
                t = t * t.Translate(0, transform.second.asDouble(), 0);
              } else if (transform.first.asString() == "scale") {
                t = t * t.Scale(transform.second.asDouble(), transform.second.asDouble(), transform.second.asDouble());
              } else if (transform.first.asString() == "skewX") {
                t = t * t.Skew(CSSAngle(transform.second.asString()).value, 0);
              } else if (transform.first.asString() == "skewY") {
                t = t * t.Skew(0, CSSAngle(transform.second.asString()).value);
              } else if (transform.first.asString() == "rotate") {
                double angle = CSSAngle(transform.second.asString()).value;
                t = t * t.Rotate(angle, angle, angle);
              } else if (transform.first.asString() == "rotateX") {
                double angle = CSSAngle(transform.second.asString()).value;
                t = t * t.RotateX(angle);
              } else if (transform.first.asString() == "rotateY") {
                double angle = CSSAngle(transform.second.asString()).value;
                t = t * t.RotateY(angle);
              } else if (transform.first.asString() == "rotateZ") {
                double angle = CSSAngle(transform.second.asString()).value;
                t = t * t.RotateZ(angle);
              }
            }
          }

          builder.setTransform(t);
          break;
        }

        case RAW_PROPS_KEY_HASH("backgroundColor"): {
          builder.setBackgroundColor(SharedColor(static_cast<int>(pair.second.asInt())));
          break;
        }

        case RAW_PROPS_KEY_HASH("shadowColor"): {
          builder.setShadowColor(SharedColor(static_cast<int>(pair.second.asInt())));
          break;
        }

        case RAW_PROPS_KEY_HASH("shadowOpacity"): {
          builder.setShadowOpacity(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("shadowRadius"): {
          builder.setShadowRadius(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("shadowOffset"): {
          auto shadowOffset = pair.second;
          auto width = shadowOffset["width"].asDouble();
          auto height = shadowOffset["height"].asDouble();
          builder.setShadowOffset(facebook::react::Size{width, height});
        }

          // MARGIN

        case RAW_PROPS_KEY_HASH("margin"): {
          margin.all = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("marginTop"): {
          margin.top = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("marginBottom"): {
          margin.bottom = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("marginHorizontal"): {
          margin.horizontal = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("marginVertical"): {
          margin.vertical = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("marginLeft"): {
          margin.left = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("marginRight"): {
          margin.right = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("marginStart"): {
          margin.start = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("marginEnd"): {
          margin.end = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

          // PADDING

        case RAW_PROPS_KEY_HASH("padding"): {
          padding.all = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("paddingTop"): {
          padding.top = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("paddingBottom"): {
          padding.bottom = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("paddingHorizontal"): {
          padding.horizontal = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("paddingVertical"): {
          padding.vertical = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("paddingLeft"): {
          padding.left = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("paddingRight"): {
          padding.right = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("paddingStart"): {
          padding.start = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("paddingEnd"): {
          padding.end = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

          // POSITIONS
        case RAW_PROPS_KEY_HASH("top"): {
          position.top = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("bottom"): {
          position.bottom = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("left"): {
          position.left = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("right"): {
          position.right = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

          // BORDER WIDTH

        case RAW_PROPS_KEY_HASH("borderWidth"): {
          borderWidth.all = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("borderLeftWidth"): {
          borderWidth.left = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("borderRightWidth"): {
          borderWidth.right = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("borderTopWidth"): {
          borderWidth.top = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("borderBottomWidth"): {
          borderWidth.bottom = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("borderStartWidth"): {
          borderWidth.start = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        case RAW_PROPS_KEY_HASH("borderEndWidth"): {
          borderWidth.end = yoga::StyleLength::points(pair.second.asDouble());
          break;
        }

        default:
          printf("AnimationMutations: Unsupported prop \n");
      }
    }

    // TODO: This shouldn't be set there, but leaving it for now
    builder.setBorderRadii(borderRadii);
    builder.setMargin(margin);
    builder.setPadding(padding);
    builder.setPosition(position);
    builder.setBorderWidth(borderWidth);
    mutations.push_back(AnimationMutation{node->getTag(), &node->getFamily(), builder.get()});
  }
}

} // namespace reanimated::css
