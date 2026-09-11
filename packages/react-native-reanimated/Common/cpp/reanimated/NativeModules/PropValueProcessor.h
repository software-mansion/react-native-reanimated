#pragma once

#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/LayoutableShadowNode.h>
#include <react/renderer/core/ShadowNode.h>
#include <react/renderer/graphics/BackgroundImage.h>

#include <memory>
#include <string>
#include <unordered_set>
#include <vector>

namespace reanimated {

using namespace facebook;
using namespace react;

class PropValueProcessor {
 public:
  static const std::unordered_set<std::string> layoutProps;
  static const std::unordered_set<std::string> styleProps;

  static std::string
  processPropValue(const std::string &propName, const std::shared_ptr<const ShadowNode> &shadowNode, jsi::Runtime &rt);

 private:
  static std::string processLayoutProp(const std::string &propName, const LayoutableShadowNode *layoutableShadowNode);

  static std::string
  processStyleProp(const std::string &propName, const std::shared_ptr<const ViewProps> &viewProps, jsi::Runtime &rt);

  static std::string stringify(const jsi::Object &object, jsi::Runtime &rt);

  static std::string intColorToHex(const int val);

  static jsi::Object boxShadowPreprocessing(const BoxShadow &boxShadow, jsi::Runtime &rt);

  static jsi::Object backgroundImagePreprocessing(const BackgroundImage &backgroundImage, jsi::Runtime &rt);

  static jsi::Object linearGradientPreprocessing(const LinearGradient &linearGradient, jsi::Runtime &rt);

  static jsi::Object radialGradientPreprocessing(const RadialGradient &radialGradient, jsi::Runtime &rt);

  static jsi::Array colorStopsPreprocessing(const std::vector<ColorStop> &colorStops, jsi::Runtime &rt);

  static jsi::Value sharedColorToJsi(const SharedColor &color, jsi::Runtime &rt);

  static jsi::Value valueUnitToJsi(const ValueUnit &valueUnit, jsi::Runtime &rt);

  static bool isLayoutProp(const std::string &propName);

  static bool isStyleProp(const std::string &propName);
};

} // namespace reanimated
