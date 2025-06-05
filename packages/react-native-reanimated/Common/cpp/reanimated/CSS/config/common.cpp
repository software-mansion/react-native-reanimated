#include <reanimated/CSS/config/common.h>

namespace reanimated::css {

void parseRawValue(
    const RawValue &rawValue,
    std::function<void(jsi::Runtime &, const jsi::Value &)> parser) {
  auto pair =
      reinterpret_cast<JsiValuePair *>(const_cast<RawValue *>(&rawValue));
  parser(*pair->first, pair->second);
}

double parseDuration(jsi::Runtime &rt, const jsi::Object &config) {
  return config.getProperty(rt, "duration").asNumber();
}

std::shared_ptr<Easing> parseTimingFunction(
    jsi::Runtime &rt,
    const jsi::Object &config) {
  return createOrGetEasing(rt, config.getProperty(rt, "timingFunction"));
}

double parseDelay(jsi::Runtime &rt, const jsi::Object &config) {
  return config.getProperty(rt, "delay").asNumber();
}

} // namespace reanimated::css
