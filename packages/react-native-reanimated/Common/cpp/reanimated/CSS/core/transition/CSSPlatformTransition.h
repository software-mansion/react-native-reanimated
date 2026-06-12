#pragma once

#include <reanimated/CSS/core/transition/CSSPlatformTransitionProxy.h>
#include <reanimated/CSS/utils/reversingShortening.h>

#include <react/renderer/core/ReactPrimitives.h>

#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

namespace reanimated::css {

using namespace facebook;
using namespace react;

class CSSPlatformTransition {
 public:
  CSSPlatformTransition(Tag viewTag, const std::shared_ptr<CSSPlatformTransitionProxy> &proxy);

  CSSPlatformTransition(const CSSPlatformTransition &) = delete;

  void run(const CSSPlatformTransitionConfig &config, double timestamp);
  void run(const ParsedPlatformDiffs &propertiesDiffs, double timestamp);

  void updateSettings(
      const PropertiesSettingsMap &changedPropertiesSettings,
      const std::vector<std::string> &removedProperties);

  void cancel(const std::string &propertyName);
  void cancelAll();

 private:
  struct ActiveProperty {
    PlatformValue adjustedStart;
    PlatformValue adjustedEnd;
    ReversingState previous;
  };

  void applyEntry(
      const std::string &propertyName,
      PlatformValue fromValue,
      PlatformValue toValue,
      const CSSTransitionPropertySettings &settings,
      double timestamp);

  const Tag viewTag_;
  const std::shared_ptr<CSSPlatformTransitionProxy> proxy_;
  std::unordered_map<std::string, ActiveProperty> activeProperties_;
  PropertiesSettingsMap settings_;
};

} // namespace reanimated::css
