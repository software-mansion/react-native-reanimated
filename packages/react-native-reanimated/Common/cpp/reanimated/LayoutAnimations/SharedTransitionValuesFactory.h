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

struct TransformOperationWithDefault {
  jsi::Object currentValue;
  jsi::Object defaultValue;
  TransformOperationWithDefault(jsi::Object &current, jsi::Object &defaultVal)
      : currentValue(std::move(current)), defaultValue(std::move(defaultVal)) {}
};

struct BoxShadowWithDefault {
  jsi::Object currentValue;
  jsi::Object defaultValue;
  BoxShadowWithDefault(jsi::Object &current, jsi::Object &defaultVal)
      : currentValue(std::move(current)), defaultValue(std::move(defaultVal)) {}
};

class SharedTransitionValuesFactory {
  jsi::Runtime &rt_;

  void setProperty(jsi::Object &values, const char *name, jsi::Value &&value);

  void diffFrame(jsi::Object &values, const ShadowView &sourceView, const ShadowView &targetView);
  void diffOpacity(jsi::Object &values, const ViewProps &sourceViewProps, const ViewProps &targetViewProps);
  void diffBackgroundColor(jsi::Object &values, const ViewProps &sourceViewProps, const ViewProps &targetViewProps);

  void diffTransform(jsi::Object &values, const ViewProps &sourceViewProps, const ViewProps &targetViewProps);
  std::vector<TransformOperationWithDefault> getTransformOperationsFromProps(const ViewProps &props);
  void maybeAddOperationToDiff(
      const char *name,
      float value,
      float defaultValue,
      std::vector<TransformOperationWithDefault> &jsiOperations);

  void diffTransformOrigin(
      jsi::Object &values,
      const ShadowView &sourceView,
      const ShadowView &targetView,
      const ViewProps &sourceViewProps,
      const ViewProps &targetViewProps);
  void addTransformOriginToDiff(
      jsi::Object &values,
      const TransformOrigin &transformOrigin,
      const ShadowView &view,
      const char *name);

  void diffShadow(jsi::Object &values, const ViewProps &sourceViewProps, const ViewProps &targetViewProps);
  std::vector<BoxShadowWithDefault> getBoxShadowsFromProps(const ViewProps &props);

  void diffBorder(jsi::Object &values, const ViewProps &sourceViewProps, const ViewProps &targetViewProps);
  void diffBorderRadius(
      jsi::Object &values,
      const std::optional<react::ValueUnit> &sourceValue,
      const std::optional<react::ValueUnit> &targetValue,
      const char *sourceName,
      const char *targetName,
      const ViewProps &sourceViewProps,
      const ViewProps &targetViewProps);
  void diffBorderWidth(
      jsi::Object &values,
      const std::optional<react::Float> &sourceValue,
      const std::optional<react::Float> &targetValue,
      const char *sourceName,
      const char *targetName,
      float defaultSourceWidth,
      float defaultTargetWidth);
  void diffBorderColors(
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
