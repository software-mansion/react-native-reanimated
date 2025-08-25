#include <jsi/jsi.h>
#include <reanimated/NativeModules/PropValueProcessor.h>

#include <iomanip>
#include <sstream>
#include <stdexcept>
#include <unordered_set>

namespace reanimated {
const std::unordered_set<std::string> PropValueProcessor::layoutProps = {
    "width",
    "height",
    "top",
    "left"};
const std::unordered_set<std::string> PropValueProcessor::styleProps = {
    "opacity",
    "zIndex",
    "backgroundColor",
    "boxShadow"};

std::string PropValueProcessor::processPropValue(
    const std::string &propName,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    jsi::Runtime &rt) {
  if (isLayoutProp(propName)) {
    auto layoutableShadowNode =
        dynamic_cast<const LayoutableShadowNode *>(shadowNode.get());
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

  throw std::runtime_error(std::string(
      "Getting property `" + propName +
      "` with function `getViewProp` is not supported"));
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
      result.setValueAtIndex(
          rt, i, boxShadowPreprocessing(viewProps->boxShadow[i], rt));
    }
    return rt.global()
        .getPropertyAsObject(rt, "JSON")
        .getPropertyAsFunction(rt, "stringify")
        .call(rt, result)
        .asString(rt)
        .utf8(rt);
  }

  throw std::runtime_error("Unsupported style property: " + propName);
}

jsi::Object PropValueProcessor::boxShadowPreprocessing(
    const BoxShadow &boxShadow,
    jsi::Runtime &rt) {
  jsi::Object result(rt);
  result.setProperty(rt, "offsetX", boxShadow.offsetX);
  result.setProperty(rt, "offsetY", boxShadow.offsetY);
  result.setProperty(rt, "blurRadius", boxShadow.blurRadius);
  result.setProperty(rt, "spreadDistance", boxShadow.spreadDistance);
  result.setProperty(rt, "color", intColorToHex(*boxShadow.color));
  result.setProperty(rt, "inset", boxShadow.inset ? true : false);
  return result;
}

std::string PropValueProcessor::intColorToHex(const int val) {
  std::stringstream invertedHexColorStream;
  // By default transparency is first, color second
  invertedHexColorStream << std::setfill('0') << std::setw(8) << std::hex
                         << val;

  auto invertedHexColor = invertedHexColorStream.str();
  auto hexColor =
      "#" + invertedHexColor.substr(2, 6) + invertedHexColor.substr(0, 2);

  return hexColor;
}

bool PropValueProcessor::isLayoutProp(const std::string &propName) {
  return layoutProps.contains(propName);
}

bool PropValueProcessor::isStyleProp(const std::string &propName) {
  return styleProps.contains(propName);
}

} // namespace reanimated
