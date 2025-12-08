#include <reanimated/Fabric/updates/UpdatesRegistry.h>
#include <reanimated/CSS/common/values/CSSAngle.h>
#include <reanimated/CSS/utils/propsBuilderWrapper.h>

#include <react/renderer/animationbackend/AnimatedPropsBuilder.h>
#include <react/renderer/animationbackend/AnimationBackend.h>

#include <folly/json.h>

using namespace facebook::react;

namespace reanimated::css {

void addToPropsBuilder(
    const std::shared_ptr<facebook::react::AnimatedPropsBuilder> &propsBuilder,
    const folly::dynamic &interpolatedValue,
    const std::string &propertyName) {
  printf("addsToPropsBuilder");

  auto nameHash = RAW_PROPS_KEY_HASH(propertyName);
  switch (nameHash) {

    case RAW_PROPS_KEY_HASH("width"):
      propsBuilder->setWidth(facebook::yoga::Style::SizeLength::points(interpolatedValue.asDouble()));
      break;

    case RAW_PROPS_KEY_HASH("height"):
      propsBuilder->setHeight(facebook::yoga::Style::SizeLength::points(interpolatedValue.asDouble()));
      break;

    case RAW_PROPS_KEY_HASH("backgroundColor"):
      propsBuilder->setBackgroundColor(facebook::react::SharedColor(static_cast<int>(interpolatedValue.asInt())));
      break;

    case RAW_PROPS_KEY_HASH("opacity"):
      propsBuilder->setOpacity(interpolatedValue.asDouble());
      break;

    default:
      printf("Property %s not handled in addToPropsBuilder\n", propertyName.c_str());
      break;
  }
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
