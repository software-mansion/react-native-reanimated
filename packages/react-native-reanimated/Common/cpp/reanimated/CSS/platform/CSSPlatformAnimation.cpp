#include <reanimated/CSS/platform/CSSPlatformAnimation.h>

#include <reanimated/CSS/interpolation/transforms/TransformOperation.h>
#include <reanimated/CSS/interpolation/transforms/operations/matrix.h>

#include <utility>

namespace reanimated::css {

// Compose a CSS transform operations array into a flat 16-element matrix.
static folly::dynamic composeTransformToMatrix(const folly::dynamic &transformOps) {
  if (!transformOps.isArray() || transformOps.empty()) {
    TransformMatrix3D identity;
    return identity.toDynamic();
  }

  TransformOperations operations;
  operations.reserve(transformOps.size());

  for (const auto &op : transformOps) {
    operations.push_back(TransformOperation::fromDynamic(op));
  }

  return matrixFromOperations3D(operations).toDynamic();
}

// Returns [x1, y1, x2, y2] for cubic bezier, nullptr for linear.
static folly::dynamic serializeEasing(const EasingConfig &config) {
  if (auto *bezier = std::get_if<CubicBezierEasing>(&config)) {
    return folly::dynamic::array(bezier->x1, bezier->y1, bezier->x2, bezier->y2);
  }
  return nullptr;
}

static folly::dynamic buildDescriptor(
    const std::string &propName,
    const RawPropertyKeyframes &rawKf,
    const std::shared_ptr<KeyframeEasingConfigs> &keyframeEasings,
    const EasingConfig &defaultEasing) {
  folly::dynamic keyframesArray = folly::dynamic::array;
  folly::dynamic easingsArray = folly::dynamic::array;

  bool hasOffset0 = !rawKf.keyframes.empty() && rawKf.keyframes.front().first == 0;
  bool hasOffset1 = !rawKf.keyframes.empty() && rawKf.keyframes.back().first == 1;

  if (!hasOffset0) {
    // If there is no keyframe at offset 0, add an empty keyframe to resolve later from the view style.
    keyframesArray.push_back(folly::dynamic::object("offset", 0.0)("value", folly::dynamic()));
  }

  auto resolve = (propName == "transform")
      ? [](const folly::dynamic &v) { return v.isArray() ? composeTransformToMatrix(v) : v; }
      : [](const folly::dynamic &v) -> folly::dynamic { return v; };

  for (const auto &[offset, value] : rawKf.keyframes) {
    keyframesArray.push_back(folly::dynamic::object("offset", offset)("value", resolve(value)));
  }

  if (!hasOffset1) {
    // If there is no keyframe at offset 1, add an empty keyframe to resolve later from the view style.
    keyframesArray.push_back(folly::dynamic::object("offset", 1.0)("value", folly::dynamic()));
  }

  for (size_t i = 0; i + 1 < keyframesArray.size(); ++i) {
    const double offset = keyframesArray[i]["offset"].asDouble();
    const EasingConfig *easing = &defaultEasing;

    if (keyframeEasings) {
      auto it = keyframeEasings->find(offset);
      if (it != keyframeEasings->end()) {
        easing = &it->second;
      }
    }

    easingsArray.push_back(serializeEasing(*easing));
  }

  return folly::dynamic::object("keyPath", propName)("keyframes", std::move(keyframesArray))(
      "easings", std::move(easingsArray));
}

static folly::dynamic buildDescriptors(
    const std::unordered_map<std::string, RawPropertyKeyframes> &propertyKeyframes,
    const std::shared_ptr<KeyframeEasingConfigs> &keyframeEasings,
    const CSSAnimationSettings &settings) {
  folly::dynamic descriptorsArray = folly::dynamic::array;

  for (const auto &[propName, rawKf] : propertyKeyframes) {
    descriptorsArray.push_back(buildDescriptor(propName, rawKf, keyframeEasings, settings.easingConfig));
  }

  return descriptorsArray;
}

folly::dynamic CSSPlatformAnimation::buildSettingsConfig(const CSSAnimationSettings &settings) {
  return folly::dynamic::object("duration", settings.duration)("iterationCount", settings.iterationCount)(
      "direction", static_cast<int>(settings.direction));
}

CSSPlatformAnimation::CSSPlatformAnimation(
    const Tag viewTag,
    std::string animationName,
    const std::unordered_map<std::string, RawPropertyKeyframes> &propertyKeyframes,
    const std::shared_ptr<KeyframeEasingConfigs> &keyframeEasings,
    CSSAnimationSettings settings)
    : viewTag_(viewTag),
      animationName_(std::move(animationName)),
      settings_(std::move(settings)),
      config_(
          folly::dynamic::object("name", animationName_)(
              "descriptors",
              buildDescriptors(propertyKeyframes, keyframeEasings, settings_))(
              "settings",
              buildSettingsConfig(settings_))) {}

const std::string &CSSPlatformAnimation::getAnimationName() const {
  return animationName_;
}

folly::dynamic CSSPlatformAnimation::buildConfig(const std::shared_ptr<ViewStylesRepository> &viewStylesRepository) {
  folly::dynamic result = config_;

  for (auto &desc : result["descriptors"]) {
    const auto propName = desc["keyPath"].asString();
    auto resolve = (propName == "transform")
        ? [](const folly::dynamic &v) { return v.isArray() ? composeTransformToMatrix(v) : v; }
        : [](const folly::dynamic &v) -> folly::dynamic { return v; };

    for (auto &kf : desc["keyframes"]) {
      if (kf["value"].isNull()) {
        kf["value"] = resolve(viewStylesRepository->getStyleProp(viewTag_, PropertyPath{propName}));
      }
    }
  }

  return result;
}

folly::dynamic CSSPlatformAnimation::getFirstKeyframeValues() const {
  folly::dynamic result = folly::dynamic::object;
  for (const auto &desc : config_["descriptors"]) {
    const auto &firstKf = desc["keyframes"][0];
    if (!firstKf["value"].isNull()) {
      result[desc["keyPath"].asString()] = firstKf["value"];
    }
  }
  return result;
}

folly::dynamic CSSPlatformAnimation::getLastKeyframeValues() const {
  folly::dynamic result = folly::dynamic::object;
  for (const auto &desc : config_["descriptors"]) {
    const auto &kfs = desc["keyframes"];
    const auto &lastKf = kfs[kfs.size() - 1];
    if (!lastKf["value"].isNull()) {
      result[desc["keyPath"].asString()] = lastKf["value"];
    }
  }
  return result;
}

void CSSPlatformAnimation::setSettings(const CSSAnimationSettings &settings) {
  settings_ = settings;
  config_["settings"] = buildSettingsConfig(settings_);
}

} // namespace reanimated::css
