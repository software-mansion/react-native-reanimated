#include <jsi/jsi.h>
#include <reanimated/NativeModules/PropValueProcessor.h>

#include <iomanip>
#include <memory>
#include <sstream>
#include <stdexcept>
#include <string>
#include <unordered_set>
#include <variant>

namespace reanimated {
const std::unordered_set<std::string> PropValueProcessor::layoutProps = {"width", "height", "top", "left"};
const std::unordered_set<std::string> PropValueProcessor::styleProps =
    {"opacity", "zIndex", "backgroundColor", "boxShadow", "backgroundImage"};

std::string PropValueProcessor::processPropValue(
    const std::string &propName,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    jsi::Runtime &rt) {
  if (!shadowNode) {
    throw std::runtime_error("Cannot obtain property `" + propName + "` because the view is no longer mounted");
  }
  if (isLayoutProp(propName)) {
    auto layoutableShadowNode = dynamic_cast<const LayoutableShadowNode *>(shadowNode.get());
    if (!layoutableShadowNode) {
      throw std::runtime_error(
          "Cannot cast shadow node to "
          "LayoutableShadowNode for layout property: " +
          propName);
    }
    return processLayoutProp(propName, layoutableShadowNode);
  } else if (isStyleProp(propName)) {
    auto props = shadowNode->getProps();
    auto viewProps = std::static_pointer_cast<const ViewProps>(props);
    return processStyleProp(propName, viewProps, rt);
  }

  throw std::runtime_error(
      std::string("Getting property `" + propName + "` with function `getViewProp` is not supported"));
}

std::string PropValueProcessor::processLayoutProp(
    const std::string &propName,
    const LayoutableShadowNode *layoutableShadowNode) {
  const auto &frame = layoutableShadowNode->layoutMetrics_.frame;

  if (propName == "width") {
    return std::to_string(frame.size.width);
  } else if (propName == "height") {
    return std::to_string(frame.size.height);
  } else if (propName == "top") {
    return std::to_string(frame.origin.y);
  } else if (propName == "left") {
    return std::to_string(frame.origin.x);
  }

  throw std::runtime_error("Unsupported layout property: " + propName);
}

std::string PropValueProcessor::processStyleProp(
    const std::string &propName,
    const std::shared_ptr<const ViewProps> &viewProps,
    jsi::Runtime &rt) {
  if (propName == "opacity") {
    return std::to_string(viewProps->opacity);
  } else if (propName == "zIndex") {
    if (viewProps->zIndex.has_value()) {
      return std::to_string(*viewProps->zIndex);
    }
    return "0"; // Default value when zIndex is not set
  } else if (propName == "backgroundColor") {
    return intColorToHex(*viewProps->backgroundColor);
  } else if (propName == "boxShadow") {
    jsi::Array result = jsi::Array(rt, viewProps->boxShadow.size());
    for (size_t i = 0; i < viewProps->boxShadow.size(); i++) {
      result.setValueAtIndex(rt, i, boxShadowPreprocessing(viewProps->boxShadow[i], rt));
    }
    return stringify(result, rt);
  } else if (propName == "backgroundImage") {
    jsi::Array result = jsi::Array(rt, viewProps->backgroundImage.size());
    for (size_t i = 0; i < viewProps->backgroundImage.size(); i++) {
      result.setValueAtIndex(rt, i, backgroundImagePreprocessing(viewProps->backgroundImage[i], rt));
    }
    return stringify(result, rt);
  }

  throw std::runtime_error("Unsupported style property: " + propName);
}

std::string PropValueProcessor::stringify(const jsi::Object &object, jsi::Runtime &rt) {
  return rt.global()
      .getPropertyAsObject(rt, "JSON")
      .getPropertyAsFunction(rt, "stringify")
      .call(rt, object)
      .asString(rt)
      .utf8(rt);
}

jsi::Object PropValueProcessor::boxShadowPreprocessing(const BoxShadow &boxShadow, jsi::Runtime &rt) {
  jsi::Object result(rt);
  result.setProperty(rt, "offsetX", boxShadow.offsetX);
  result.setProperty(rt, "offsetY", boxShadow.offsetY);
  result.setProperty(rt, "blurRadius", boxShadow.blurRadius);
  result.setProperty(rt, "spreadDistance", boxShadow.spreadDistance);
  result.setProperty(rt, "color", intColorToHex(*boxShadow.color));
  result.setProperty(rt, "inset", boxShadow.inset ? true : false);
  return result;
}

jsi::Object PropValueProcessor::backgroundImagePreprocessing(const BackgroundImage &backgroundImage, jsi::Runtime &rt) {
  if (std::holds_alternative<LinearGradient>(backgroundImage)) {
    return linearGradientPreprocessing(std::get<LinearGradient>(backgroundImage), rt);
  }
  return radialGradientPreprocessing(std::get<RadialGradient>(backgroundImage), rt);
}

jsi::Object PropValueProcessor::linearGradientPreprocessing(const LinearGradient &linearGradient, jsi::Runtime &rt) {
  jsi::Object direction(rt);
  if (std::holds_alternative<Float>(linearGradient.direction)) {
    direction.setProperty(rt, "type", "angle");
    direction.setProperty(rt, "value", static_cast<double>(std::get<Float>(linearGradient.direction)));
  } else {
    direction.setProperty(rt, "type", "keyword");
    switch (std::get<GradientKeyword>(linearGradient.direction)) {
      case GradientKeyword::ToTopRight:
        direction.setProperty(rt, "value", "to top right");
        break;
      case GradientKeyword::ToBottomRight:
        direction.setProperty(rt, "value", "to bottom right");
        break;
      case GradientKeyword::ToTopLeft:
        direction.setProperty(rt, "value", "to top left");
        break;
      case GradientKeyword::ToBottomLeft:
        direction.setProperty(rt, "value", "to bottom left");
        break;
    }
  }

  jsi::Object result(rt);
  result.setProperty(rt, "type", "linear-gradient");
  result.setProperty(rt, "direction", direction);
  result.setProperty(rt, "colorStops", colorStopsPreprocessing(linearGradient.colorStops, rt));
  return result;
}

jsi::Object PropValueProcessor::radialGradientPreprocessing(const RadialGradient &radialGradient, jsi::Runtime &rt) {
  jsi::Object result(rt);
  result.setProperty(rt, "type", "radial-gradient");
  result.setProperty(rt, "shape", radialGradient.shape == RadialGradientShape::Circle ? "circle" : "ellipse");

  if (std::holds_alternative<RadialGradientSize::SizeKeyword>(radialGradient.size.value)) {
    switch (std::get<RadialGradientSize::SizeKeyword>(radialGradient.size.value)) {
      case RadialGradientSize::SizeKeyword::ClosestSide:
        result.setProperty(rt, "size", "closest-side");
        break;
      case RadialGradientSize::SizeKeyword::FarthestSide:
        result.setProperty(rt, "size", "farthest-side");
        break;
      case RadialGradientSize::SizeKeyword::ClosestCorner:
        result.setProperty(rt, "size", "closest-corner");
        break;
      case RadialGradientSize::SizeKeyword::FarthestCorner:
        result.setProperty(rt, "size", "farthest-corner");
        break;
    }
  } else {
    const auto &dimensions = std::get<RadialGradientSize::Dimensions>(radialGradient.size.value);
    jsi::Object size(rt);
    size.setProperty(rt, "x", valueUnitToJsi(dimensions.x, rt));
    size.setProperty(rt, "y", valueUnitToJsi(dimensions.y, rt));
    result.setProperty(rt, "size", size);
  }

  jsi::Object position(rt);
  if (radialGradient.position.top.has_value()) {
    position.setProperty(rt, "top", valueUnitToJsi(*radialGradient.position.top, rt));
  }
  if (radialGradient.position.bottom.has_value()) {
    position.setProperty(rt, "bottom", valueUnitToJsi(*radialGradient.position.bottom, rt));
  }
  if (radialGradient.position.left.has_value()) {
    position.setProperty(rt, "left", valueUnitToJsi(*radialGradient.position.left, rt));
  }
  if (radialGradient.position.right.has_value()) {
    position.setProperty(rt, "right", valueUnitToJsi(*radialGradient.position.right, rt));
  }
  result.setProperty(rt, "position", position);

  result.setProperty(rt, "colorStops", colorStopsPreprocessing(radialGradient.colorStops, rt));
  return result;
}

jsi::Array PropValueProcessor::colorStopsPreprocessing(const std::vector<ColorStop> &colorStops, jsi::Runtime &rt) {
  jsi::Array result = jsi::Array(rt, colorStops.size());
  for (size_t i = 0; i < colorStops.size(); i++) {
    jsi::Object colorStop(rt);
    colorStop.setProperty(rt, "color", sharedColorToJsi(colorStops[i].color, rt));
    colorStop.setProperty(rt, "position", valueUnitToJsi(colorStops[i].position, rt));
    result.setValueAtIndex(rt, i, colorStop);
  }
  return result;
}

jsi::Value PropValueProcessor::sharedColorToJsi(const SharedColor &color, jsi::Runtime &rt) {
  if (!color) {
    return jsi::Value::null();
  }
  return jsi::String::createFromUtf8(rt, intColorToHex(*color));
}

jsi::Value PropValueProcessor::valueUnitToJsi(const ValueUnit &valueUnit, jsi::Runtime &rt) {
  switch (valueUnit.unit) {
    case UnitType::Point:
      return jsi::Value(static_cast<double>(valueUnit.value));
    case UnitType::Percent: {
      std::ostringstream stream;
      stream << valueUnit.value << "%";
      return jsi::String::createFromUtf8(rt, stream.str());
    }
    case UnitType::Undefined:
      return jsi::Value::null();
  }
  return jsi::Value::null();
}

std::string PropValueProcessor::intColorToHex(const int val) {
  std::stringstream invertedHexColorStream;
  // By default transparency is first, color second
  invertedHexColorStream << std::setfill('0') << std::setw(8) << std::hex << val;

  auto invertedHexColor = invertedHexColorStream.str();
  auto hexColor = "#" + invertedHexColor.substr(2, 6) + invertedHexColor.substr(0, 2);

  return hexColor;
}

bool PropValueProcessor::isLayoutProp(const std::string &propName) {
  return layoutProps.contains(propName);
}

bool PropValueProcessor::isStyleProp(const std::string &propName) {
  return styleProps.contains(propName);
}

} // namespace reanimated
