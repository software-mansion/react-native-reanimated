#include <reanimated/apple/CSS/CAPlatformAnimation.h>

#include <utility>

namespace reanimated::css {

namespace {

std::optional<std::array<double, 4>> easingConfigToBezier(const EasingConfig &config) {
  if (std::holds_alternative<CubicBezierEasing>(config)) {
    const auto &bezier = std::get<CubicBezierEasing>(config);
    return std::array<double, 4>{bezier.x1, bezier.y1, bezier.x2, bezier.y2};
  }
  return std::nullopt; // linear
}

} // namespace

CAPlatformAnimation::CAPlatformAnimation(
    Tag viewTag,
    std::string name,
    std::shared_ptr<const CAKeyframesMap> data,
    std::shared_ptr<CSSAnimationSettings> settings,
    std::shared_ptr<KeyframeEasingConfigs> keyframeEasings,
    ApplyPlatformAnimationFunction applyFn,
    RemovePlatformAnimationFunction removeFn)
    : viewTag_(viewTag),
      name_(std::move(name)),
      data_(std::move(data)),
      settings_(std::move(settings)),
      keyframeEasings_(std::move(keyframeEasings)),
      applyFn_(std::move(applyFn)),
      removeFn_(std::move(removeFn)) {}

void CAPlatformAnimation::schedule() {
  if (applyFn_) {
    applyFn_(viewTag_, buildConfig());
  }
}

void CAPlatformAnimation::unschedule() {
  if (removeFn_) {
    removeFn_(viewTag_, name_);
  }
}

PlatformAnimationConfig CAPlatformAnimation::buildConfig() const {
  PlatformAnimationConfig config;
  config.name = name_;
  config.duration = settings_->duration;
  config.iterationCount = settings_->iterationCount;
  config.direction = static_cast<int>(settings_->direction);

  if (!data_) {
    return config;
  }

  for (const auto &[propertyName, keyframes] : *data_) {
    PlatformAnimationPropertyConfig propConfig;
    propConfig.keyPath = propertyName;
    propConfig.keyframes = keyframes;

    for (size_t i = 0; i < keyframes.size() - 1; ++i) {
      const auto offset = keyframes[i].offset;
      if (keyframeEasings_) {
        auto it = keyframeEasings_->find(offset);
        if (it != keyframeEasings_->end()) {
          propConfig.easings.emplace_back(easingConfigToBezier(it->second));
          continue;
        }
      }
      propConfig.easings.emplace_back(easingConfigToBezier(settings_->easingConfig));
    }

    config.properties.emplace_back(std::move(propConfig));
  }

  return config;
}

} // namespace reanimated::css
