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
      cssTransition(parseCSSTransition(rawProps)),
      cssAnimations(parseCSSAnimations(rawProps)) {}

std::optional<CSSTransitionConfig> ReanimatedNodeProps::parseCSSTransition(
    const RawProps &rawProps) {
  return parseRawProp<CSSTransitionConfig>(
      rawProps, "cssTransition", [](jsi::Runtime &rt, const jsi::Value &value) {
        return CSSTransitionConfig(rt, value);
      });
}

std::vector<CSSAnimationConfig> ReanimatedNodeProps::parseCSSAnimations(
    const RawProps &rawProps) {
  auto parsedProp = parseRawProp<std::vector<CSSAnimationConfig>>(
      rawProps, "cssAnimations", [](jsi::Runtime &rt, const jsi::Value &value) {
        std::vector<CSSAnimationConfig> animations;
        const auto animationConfigs = value.asObject(rt).asArray(rt);
        const auto configsCount = animationConfigs.size(rt);

        animations.reserve(configsCount);
        for (size_t i = 0; i < configsCount; i++) {
          animations.emplace_back(rt, animationConfigs.getValueAtIndex(rt, i));
        }
        return animations;
      });
  return std::move(parsedProp).value_or(std::vector<CSSAnimationConfig>{});
}

template <typename T>
std::optional<T> ReanimatedNodeProps::parseRawProp(
    const RawProps &rawProps,
    const char *propName,
    std::function<T(jsi::Runtime &, const jsi::Value &)> parser) {
  auto rawValue = const_cast<RawValue *>(rawProps.at(propName, "", ""));
  auto pair = (JsiValuePair *)rawValue;

  if (pair && pair->second.isObject()) {
    return parser(*pair->first, pair->second);
  }

  return std::nullopt;
}

} // namespace facebook::react
