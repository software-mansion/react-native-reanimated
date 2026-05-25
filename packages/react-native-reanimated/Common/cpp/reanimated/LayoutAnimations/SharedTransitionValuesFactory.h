#pragma once
#include <react/renderer/components/view/ViewProps.h>
#include <react/renderer/core/graphicsConversions.h>
#include <react/renderer/mounting/ShadowView.h>
#include <reanimated/LayoutAnimations/LayoutAnimationsUtils.h>

#include <jsi/jsi.h>

#include <string>
#include <utility>
#include <vector>

using namespace facebook;
using namespace facebook::react;

namespace reanimated {

struct BoxShadowWithDefault {
  jsi::Object currentValue;
  jsi::Object defaultValue;
  BoxShadowWithDefault(jsi::Object &current, jsi::Object &defaultVal)
      : currentValue(std::move(current)), defaultValue(std::move(defaultVal)) {}
};

class SharedTransitionValuesFactory {
  jsi::Runtime &rt_;

  void setProperty(jsi::Object &values, const char *name, jsi::Value &&value);

  void writeFrame(jsi::Object &values, const ShadowView &sourceView, const ShadowView &targetView);
  void writeOpacity(jsi::Object &values, const ViewProps &sourceViewProps, const ViewProps &targetViewProps);
  void writeBackgroundColor(jsi::Object &values, const ViewProps &sourceViewProps, const ViewProps &targetViewProps);

  void writeTransform(jsi::Object &values, const ViewProps &sourceViewProps, const ViewProps &targetViewProps);
  jsi::Array buildMatrixArray(const ViewProps &props);
  jsi::Object buildTransformObject(const ViewProps &props);

  void writeTransformOrigin(
      jsi::Object &values,
      const ShadowView &sourceView,
      const ShadowView &targetView,
      const ViewProps &sourceViewProps,
      const ViewProps &targetViewProps);

  void writeShadow(jsi::Object &values, const ViewProps &sourceViewProps, const ViewProps &targetViewProps);
  std::vector<BoxShadowWithDefault> getBoxShadowsFromProps(const ViewProps &props);

  void writeBorder(jsi::Object &values, const ViewProps &sourceViewProps, const ViewProps &targetViewProps);
  void writeBorderRadius(
      jsi::Object &values,
      const std::optional<react::ValueUnit> &sourceValue,
      const std::optional<react::ValueUnit> &targetValue,
      const char *sourceName,
      const char *targetName,
      const ViewProps &sourceViewProps,
      const ViewProps &targetViewProps);
  void writeBorderWidth(
      jsi::Object &values,
      const std::optional<react::Float> &sourceValue,
      const std::optional<react::Float> &targetValue,
      const char *sourceName,
      const char *targetName,
      float defaultSourceWidth,
      float defaultTargetWidth);
  void writeBorderColors(
      jsi::Object &values,
      const std::optional<react::SharedColor> &sourceValue,
      const std::optional<react::SharedColor> &targetValue,
      const char *sourceName,
      const char *targetName,
      const ViewProps &sourceViewProps,
      const ViewProps &targetViewProps);

  static inline std::string toString(const SharedColor &value);

 public:
  explicit SharedTransitionValuesFactory(jsi::Runtime &rt) : rt_(rt) {}

  jsi::Object create(const ShadowView &sourceView, const ShadowView &targetView);
};

} // namespace reanimated
