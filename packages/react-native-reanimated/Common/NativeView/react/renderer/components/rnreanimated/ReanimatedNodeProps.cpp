#include <react/renderer/components/rnreanimated/ReanimatedNodeProps.h>

namespace facebook::react {

ReanimatedNodeProps::ReanimatedNodeProps(
    const PropsParserContext &context,
    const ReanimatedNodeProps &sourceProps,
    const RawProps &rawProps)
    : ViewProps(context, sourceProps, rawProps),
      jsStyle(convertRawProp(
          context,
          rawProps,
          "jsStyle",
          sourceProps.jsStyle,
          {})) {
  auto rawValue = const_cast<RawValue *>(rawProps.at("cssTransition", "", ""));
  auto pair = (JsiValuePair *)rawValue;

  if (pair) {
    auto &[rt, value] = *pair;
    if (value.isObject()) {
      cssTransition = CSSTransitionConfig(*rt, value);
    }
  }

  auto rawValue2 = const_cast<RawValue *>(rawProps.at("cssAnimations", "", ""));
  auto pair2 = (JsiValuePair *)rawValue2;

  if (pair2) {
    auto &[runtime, value] = *pair2;
    auto &rt = *runtime;
    if (value.isObject()) {
      const auto animationConfigs = value.asObject(rt).asArray(rt);
      const auto configsCount = animationConfigs.size(rt);

      cssAnimations.reserve(configsCount);
      for (size_t i = 0; i < configsCount; i++) {
        cssAnimations.emplace_back(rt, animationConfigs.getValueAtIndex(rt, i));
      }
    }
  }
}

} // namespace facebook::react
