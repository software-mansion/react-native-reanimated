#pragma once

#include <reanimated/CSS/config/CSSKeyframesConfig.h>
#include <reanimated/CSS/util/jsi.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <utility>

namespace reanimated::css {

using AnimationTag = int32_t;

class CSSKeyframesRegistry {
 public:
  const CSSKeyframesConfig &getOrCreate(
      jsi::Runtime &rt,
      const jsi::Value &config);

  // TODO - add keyframes removal when no longer used

 private:
  static AnimationTag nextInlineTag;

  std::unordered_map<AnimationTag, CSSKeyframesConfig> registry_;
  std::unordered_map<std::string, AnimationTag> tagByCanonicalForm_;

  AnimationTag getTagFromConfig(jsi::Runtime &rt, const jsi::Value &config);
};

} // namespace reanimated::css
