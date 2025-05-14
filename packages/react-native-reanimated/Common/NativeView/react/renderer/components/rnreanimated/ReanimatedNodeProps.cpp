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
      cssTransition = parseCSSTransitionConfig(*rt, value);
    }
  }
}

} // namespace facebook::react
