#include <reanimated/CSS/registry/CSSKeyframesRegistry.h>

namespace reanimated::css {

AnimationTag CSSKeyframesRegistry::nextInlineTag = -1;

const CSSKeyframesConfig &CSSKeyframesRegistry::getOrCreate(
    jsi::Runtime &rt,
    const jsi::Value &config) {
  const auto &configObj = config.asObject(rt);
  AnimationTag tag;

  // We use positive tag numbers for css animations created with css.create
  if (configObj.hasProperty(rt, "tag")) {
    tag = configObj.getProperty(rt, "tag").asNumber();
  }
  // Or pass just keyframes config for inline css animations that were created
  // without a css.keyframes helper function and generate a negative tag number
  else {
    tag = getTagFromConfig(rt, config);
  }

  if (registry_.find(tag) == registry_.end()) {
    registry_[tag] = parseCSSAnimationKeyframesConfig(rt, config);
  }

  return registry_[tag];
}

AnimationTag CSSKeyframesRegistry::getTagFromConfig(
    jsi::Runtime &rt,
    const jsi::Value &config) {
  const auto canonicalForm = toCanonicalForm(rt, config);
  if (tagByCanonicalForm_.find(canonicalForm) != tagByCanonicalForm_.end()) {
    return tagByCanonicalForm_[canonicalForm];
  }

  return tagByCanonicalForm_[canonicalForm] = nextInlineTag--;
}

} // namespace reanimated::css
