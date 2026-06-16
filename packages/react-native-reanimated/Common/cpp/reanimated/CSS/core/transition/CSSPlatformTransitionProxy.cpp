#include <reanimated/CSS/core/transition/CSSPlatformTransitionProxy.h>

#include <react/debug/react_native_assert.h>

#include <unordered_set>
#include <utility>

namespace reanimated::css {

namespace {

// Reduces a jsi::Value transition endpoint to the representation-agnostic shape
// the platform parses (a number, a size, or monostate for null / absent).
CSSEndpointValue endpointFromJSI(jsi::Runtime &rt, const jsi::Value &value) {
  if (value.isNumber()) {
    return value.asNumber();
  }
  if (value.isObject()) {
    const auto object = value.asObject(rt);
    const auto width = object.getProperty(rt, "width");
    const auto height = object.getProperty(rt, "height");
    return std::array<double, 2>{
        width.isNumber() ? width.asNumber() : 0.0,
        height.isNumber() ? height.asNumber() : 0.0,
    };
  }
  return std::monostate{};
}

// The same reduction for the runtime-free pseudo-selector toggle path.
CSSEndpointValue endpointFromDynamic(const folly::dynamic &value) {
  if (value.isNumber()) {
    return value.asDouble();
  }
  if (value.isObject()) {
    const auto *width = value.get_ptr("width");
    const auto *height = value.get_ptr("height");
    return std::array<double, 2>{
        width != nullptr && width->isNumber() ? width->asDouble() : 0.0,
        height != nullptr && height->isNumber() ? height->asDouble() : 0.0,
    };
  }
  return std::monostate{};
}

} // namespace

CSSPlatformTransitionProxy::CSSPlatformTransitionProxy(
    CSSCanRoutePropertyFunction canRoute,
    CSSParseValueFunction parseValue,
    CSSApplyTransitionFunction applyTransition,
    CSSRemoveTransitionFunction removeTransition,
    const std::shared_ptr<ViewStylesRepository> &viewStylesRepository)
    : canRoute_(std::move(canRoute)),
      parseValue_(std::move(parseValue)),
      applyTransition_(std::move(applyTransition)),
      removeTransition_(std::move(removeTransition)),
      viewStylesRepository_(viewStylesRepository) {}

bool CSSPlatformTransitionProxy::canRoute(
    const std::string &propertyName,
    const EasingConfig &easing,
    const ShadowNode &shadowNode,
    const std::unordered_set<std::string> &transitioningProperties) const {
  return canRoute_ && canRoute_(propertyName, easing, shadowNode, transitioningProperties);
}

std::optional<PlatformValue> CSSPlatformTransitionProxy::parseValue(
    const std::string &propertyName,
    const CSSEndpointValue &value) const {
  return parseValue_ ? parseValue_(propertyName, value) : std::nullopt;
}

void CSSPlatformTransitionProxy::run(const CSSPlatformTransitionPropertyConfig &config) const {
  if (applyTransition_) {
    applyTransition_(config);
  }
}

void CSSPlatformTransitionProxy::remove(const Tag viewTag, const std::string &propertyName) const {
  if (removeTransition_) {
    removeTransition_(viewTag, propertyName);
  }
}

// Erasing from the other side's routing set returns nonzero exactly when the
// property migrates sides - that's when the old side gets a cancel.
CSSPlatformTransitionProxy::ProcessedConfig CSSPlatformTransitionProxy::processConfig(
    jsi::Runtime &rt,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    CSSTransitionConfig &&config,
    const CSSTransitionRouting &previousRouting) const {
  ProcessedConfig result;
  result.routing = previousRouting;

  // Routing eligibility is decided against the view's latest committed props.
  const auto newestShadowNode = viewStylesRepository_->getNewestShadowNode(shadowNode);

  std::unordered_set<std::string> transitioningProperties;
  transitioningProperties.reserve(config.changedPropertiesSettings.size());
  for (const auto &entry : config.changedPropertiesSettings) {
    transitioningProperties.insert(entry.first);
  }

  // extract() preserves the move-only jsi::Value diffs.
  while (!config.changedPropertiesSettings.empty()) {
    auto settingsNode = config.changedPropertiesSettings.extract(config.changedPropertiesSettings.begin());
    const auto &propertyName = settingsNode.key();
    const auto &settings = settingsNode.mapped();
    const auto valueIt = config.changedProperties.find(propertyName);

    bool routable = canRoute(propertyName, settings.easingConfig, *newestShadowNode, transitioningProperties);
    std::optional<PlatformValue> fromValue;
    std::optional<PlatformValue> toValue;
    if (routable && valueIt != config.changedProperties.end()) {
      fromValue = parseValue(propertyName, endpointFromJSI(rt, valueIt->second.first));
      toValue = parseValue(propertyName, endpointFromJSI(rt, valueIt->second.second));
      routable = fromValue.has_value() && toValue.has_value();
    }

    if (routable) {
      // loop -> platform migration: cancel on loop.
      if (result.routing.loop.erase(propertyName) > 0) {
        result.loop.removedProperties.push_back(propertyName);
      }
      result.routing.platform.insert(propertyName);

      if (valueIt != config.changedProperties.end()) {
        config.changedProperties.erase(valueIt);
        result.platform.changedProperties.push_back(
            CSSPlatformTransitionEntry{propertyName, *fromValue, *toValue, settings});
      }
      result.platform.changedPropertiesSettings.insert(std::move(settingsNode));
    } else {
      // platform -> loop migration: cancel on platform.
      if (result.routing.platform.erase(propertyName) > 0) {
        result.platform.removedProperties.push_back(propertyName);
      }
      result.routing.loop.insert(propertyName);

      if (valueIt != config.changedProperties.end()) {
        auto valueNode = config.changedProperties.extract(valueIt);
        result.loop.changedProperties.insert(std::move(valueNode));
      }
      result.loop.changedPropertiesSettings.insert(std::move(settingsNode));
    }
  }

  // The parser pairs every value diff with settings, so the drain above must
  // have consumed all of changedProperties.
  react_native_assert(config.changedProperties.empty() && "[Reanimated] CSS transition value diff without settings");

  // Forward removal cancels to the side that owns the property.
  for (auto &propertyName : config.removedProperties) {
    if (result.routing.platform.erase(propertyName) > 0) {
      result.platform.removedProperties.push_back(std::move(propertyName));
    } else if (result.routing.loop.erase(propertyName) > 0) {
      result.loop.removedProperties.push_back(std::move(propertyName));
    }
  }

  return result;
}

CSSPlatformTransitionProxy::ProcessedDynamicDiffs CSSPlatformTransitionProxy::processDynamicDiffs(
    const CSSTransitionRouting &routing,
    const PropertyValueDynamicDiffsMap &propertyDiffs) const {
  ProcessedDynamicDiffs result;
  for (const auto &[propertyName, propertyDiff] : propertyDiffs) {
    // The routing was decided when the transition was registered; here we only
    // re-parse the toggled endpoints. Values the platform cannot express fall
    // back to the loop.
    if (routing.platform.contains(propertyName)) {
      auto fromValue = parseValue(propertyName, endpointFromDynamic(propertyDiff.first));
      auto toValue = parseValue(propertyName, endpointFromDynamic(propertyDiff.second));
      if (fromValue && toValue) {
        result.platform.emplace(propertyName, std::make_pair(*fromValue, *toValue));
        continue;
      }
    }
    result.loop.emplace(propertyName, propertyDiff);
  }
  return result;
}

} // namespace reanimated::css
