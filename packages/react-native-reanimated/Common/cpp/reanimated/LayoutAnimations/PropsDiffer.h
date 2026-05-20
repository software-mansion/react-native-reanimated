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

class PropsDiffer {
  const ShadowView &sourceView_;
  const ShadowView &targetView_;
  const ViewProps &sourceViewProps_;
  const ViewProps &targetViewProps_;
  jsi::Object values_;
  Transform sourceTransform_;
  Transform targetTransform_;

  static std::string sourceKey(const char *name);
  static std::string targetKey(const char *name);
  void setSource(jsi::Runtime &rt, const char *name, jsi::Value &&value);
  void setTarget(jsi::Runtime &rt, const char *name, jsi::Value &&value);

  void diffFrame(jsi::Runtime &rt);

  void diffOpacity(jsi::Runtime &rt);

  void diffBackgroundColor(jsi::Runtime &rt);

  void diffTransform(jsi::Runtime &rt);
  static std::vector<TransformOperationWithDefault>
  getTransformOperationsFromProps(jsi::Runtime &rt, const ViewProps &props, const react::Size &viewSize);
  static void maybeAddOperationToDiff(
      jsi::Runtime &rt,
      const char *name,
      float value,
      float defaultValue,
      std::vector<TransformOperationWithDefault> &jsiOperations);

  void diffTransformOrigin(jsi::Runtime &rt);
  void addTransformOriginToDiff(
      jsi::Runtime &rt,
      const TransformOrigin &transformOrigin,
      const ShadowView &view,
      bool isTarget);

  void diffShadow(jsi::Runtime &rt);
  static std::vector<BoxShadowWithDefault> getBoxShadowsFromProps(jsi::Runtime &rt, const ViewProps &props);

  void diffBorder(jsi::Runtime &rt);
  void diffBorderRadius(
      const std::optional<react::ValueUnit> &sourceValue,
      const std::optional<react::ValueUnit> &targetValue,
      const char *name,
      jsi::Runtime &rt);
  void diffBorderWidth(
      const std::optional<react::Float> &sourceValue,
      const std::optional<react::Float> &targetValue,
      const char *name,
      jsi::Runtime &rt,
      float defaultSourceWidth,
      float defaultTargetWidth);
  void diffBorderColors(
      const std::optional<react::SharedColor> &sourceValue,
      const std::optional<react::SharedColor> &targetValue,
      const char *name,
      jsi::Runtime &rt);

  static inline std::string toString(const SharedColor &value);

 public:
  explicit PropsDiffer(jsi::Runtime &rt, const ShadowView &sourceView, const ShadowView &targetView)
      : sourceView_(sourceView),
        targetView_(targetView),
        sourceViewProps_(getViewProps(sourceView)),
        targetViewProps_(getViewProps(targetView)),
        values_(rt) {}

  jsi::Object computeDiff(jsi::Runtime &runtime);
};

} // namespace reanimated
