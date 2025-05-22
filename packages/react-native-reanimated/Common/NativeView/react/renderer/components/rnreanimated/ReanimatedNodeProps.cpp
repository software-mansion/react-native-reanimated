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
          {})),
      cssTransition(convertRawProp(
          context,
          rawProps,
          "cssTransition",
          sourceProps.cssTransition,
          std::nullopt)),
      cssAnimations(convertRawProp(
          context,
          rawProps,
          "cssAnimations",
          sourceProps.cssAnimations,
          {})) {}

} // namespace facebook::react
