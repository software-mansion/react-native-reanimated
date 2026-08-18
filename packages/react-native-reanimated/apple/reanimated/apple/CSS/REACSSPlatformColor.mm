#import <reanimated/CSS/utils/platformColor.h>

#import <TargetConditionals.h>

#if !TARGET_OS_OSX

#import <React/RCTConstants.h>
#import <React/RCTUtils.h>
#import <UIKit/UIKit.h>
#import <react/renderer/graphics/HostPlatformColor.h>
#import <react/renderer/graphics/RCTPlatformColorUtils.h>

#import <algorithm>
#import <atomic>
#import <cmath>
#import <mutex>
#import <string>
#import <vector>

namespace reanimated::css {

namespace detail {

namespace {

std::mutex traitsMutex;
UITraitCollection *storedTraits = nil;
id<NSObject> traitsObserver = nil;
std::atomic<uint64_t> appearanceCounter{0};

/// Seeds from the key window, whose traits honour overrideUserInterfaceStyle,
/// then follows RN's appearance notification. The notification also fires for
/// orientation changes, hence the explicit color-appearance check.
void watchAppearance()
{
  static dispatch_once_t onceToken;
  dispatch_once(&onceToken, ^{
    RCTUnsafeExecuteOnMainQueueSync(^{
      std::lock_guard<std::mutex> lock(traitsMutex);
      storedTraits = RCTKeyWindow().traitCollection;
    });
    traitsObserver = [NSNotificationCenter.defaultCenter
        addObserverForName:RCTUserInterfaceStyleDidChangeNotification
                    object:nil
                     queue:NSOperationQueue.mainQueue
                usingBlock:^(NSNotification *notification) {
                  UITraitCollection *next =
                      notification.userInfo[RCTUserInterfaceStyleDidChangeNotificationTraitCollectionKey];
                  std::lock_guard<std::mutex> lock(traitsMutex);

                  if (next == nil ||
                      (storedTraits != nil &&
                       ![next hasDifferentColorAppearanceComparedToTraitCollection:storedTraits])) {
                    return;
                  }
                  storedTraits = next;
                  ++appearanceCounter;
                }];
  });
}

int32_t colorField(const folly::dynamic &value, const char *name)
{
  const auto *field = value.get_ptr(name);
  return field != nullptr && field->isNumber() ? static_cast<int32_t>(field->asInt()) : 0;
}

UIColor *payloadUIColor(const folly::dynamic &value)
{
  if (const auto *semantic = value.get_ptr("semantic")) {
    std::vector<std::string> names;
    names.reserve(semantic->size());
    for (const auto &name : *semantic) {
      if (name.isString()) {
        names.push_back(name.getString());
      }
    }
    return names.empty() ? nil : RCTPlatformColorFromSemanticItems(names);
  }

  const auto *dynamicColor = value.get_ptr("dynamic");
  if (dynamicColor == nullptr) {
    return nil;
  }

  // Missing sides stay 0 (transparent), matching how RN renders the same
  // payload when it is not animated.
  return RCTPlatformColorFromColor(facebook::react::Color(facebook::react::DynamicColor{
      .lightColor = colorField(*dynamicColor, "light"),
      .darkColor = colorField(*dynamicColor, "dark"),
      .highContrastLightColor = colorField(*dynamicColor, "highContrastLight"),
      .highContrastDarkColor = colorField(*dynamicColor, "highContrastDark")}));
}

} // namespace

bool canResolvePlatformColors()
{
  return true;
}

std::optional<ColorChannels> resolvePlatformColorUncached(
    const folly::dynamic &value,
    const std::shared_ptr<const facebook::react::ShadowNode> & /*node*/)
{
  watchAppearance();

  UIColor *color = payloadUIColor(value);
  if (color == nil) {
    return std::nullopt;
  }

  UITraitCollection *traits = nil;
  {
    std::lock_guard<std::mutex> lock(traitsMutex);
    traits = storedTraits;
  }
  UIColor *resolved = traits != nil ? [color resolvedColorWithTraitCollection:traits] : color;

  CGFloat red = 0, green = 0, blue = 0, alpha = 0;
  if (![resolved getRed:&red green:&green blue:&blue alpha:&alpha]) {
    return std::nullopt;
  }

  const auto channel = [](const CGFloat component) {
    return static_cast<uint8_t>(std::lround(std::clamp<CGFloat>(component, 0.0, 1.0) * 255.0));
  };
  return ColorChannels{channel(red), channel(green), channel(blue), channel(alpha)};
}

uint64_t appearanceGeneration()
{
  watchAppearance();
  return appearanceCounter.load();
}

} // namespace detail

} // namespace reanimated::css

#else

namespace reanimated::css {

namespace detail {

bool canResolvePlatformColors()
{
  return false;
}

std::optional<ColorChannels> resolvePlatformColorUncached(
    const folly::dynamic & /*value*/,
    const std::shared_ptr<const facebook::react::ShadowNode> & /*node*/)
{
  return std::nullopt;
}

uint64_t appearanceGeneration()
{
  return 0;
}

} // namespace detail

} // namespace reanimated::css

#endif // !TARGET_OS_OSX
