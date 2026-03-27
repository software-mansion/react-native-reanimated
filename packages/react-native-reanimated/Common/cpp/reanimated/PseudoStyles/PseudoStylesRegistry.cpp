#include <reanimated/PseudoStyles/PseudoStylesRegistry.h>

#include <folly/json.h>

#include <cstdio>
#include <utility>

namespace reanimated {

using namespace facebook::react;

PseudoStylesRegistry::PseudoStylesRegistry(
    PlatformAttachPseudoSelectorFunction attachFn,
    PlatformDetachPseudoSelectorFunction detachFn)
    : attachFn_(std::move(attachFn)),
      detachFn_(std::move(detachFn)),
      onSelectorStateChangedFn_([](const auto &, const auto &, const auto &, double, double) {}) {}

void PseudoStylesRegistry::setOnSelectorStateChangedFn(OnSelectorStateChangedFn fn) {
  onSelectorStateChangedFn_ = std::move(fn);
}

void PseudoStylesRegistry::registerPseudoStyle(
    Tag tag,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const std::string &selector,
    const folly::dynamic &selectorStyle,
    const folly::dynamic &defaultStyle,
    double duration,
    double delay) {
  fprintf(
      stderr,
      "[PseudoStylesRegistry] registerPseudoStyle tag=%d selector=%s duration=%.0fms\n",
      tag,
      selector.c_str(),
      duration);
  {
    std::lock_guard<std::mutex> lock{mutex_};
    // currently it's one tag, one transition
    registry_[tag] = {shadowNode, selectorStyle, defaultStyle, duration, delay};
  }

  attachFn_(tag, selector, [weakThis = std::weak_ptr<PseudoStylesRegistry>(shared_from_this()), tag](bool isActive) {
    if (auto strongThis = weakThis.lock()) {
      strongThis->onSelectorStateChanged(tag, isActive);
    }
  });
}

void PseudoStylesRegistry::remove(Tag tag) {
  {
    std::lock_guard<std::mutex> lock{mutex_};
    registry_.erase(tag);
  }
  detachFn_(tag);
}

void PseudoStylesRegistry::onSelectorStateChanged(Tag tag, bool isActive) {
  fprintf(stderr, "[PseudoStylesRegistry] onSelectorStateChanged tag=%d isActive=%d\n", tag, isActive);

  std::shared_ptr<const ShadowNode> shadowNode;
  folly::dynamic fromStyle, toStyle;
  double duration, delay;
  {
    std::lock_guard<std::mutex> lock{mutex_};
    auto it = registry_.find(tag);
    if (it == registry_.end()) {
      fprintf(stderr, "[PseudoStylesRegistry] tag=%d not found in registry!\n", tag);
      return;
    }
    const auto &entry = it->second;
    shadowNode = entry.shadowNode;
    fromStyle = isActive ? entry.defaultStyle : entry.selectorStyle;
    toStyle = isActive ? entry.selectorStyle : entry.defaultStyle;
    duration = entry.duration;
    delay = entry.delay;
  }

  fprintf(stderr, "[PseudoStylesRegistry] applying style: %s\n", folly::toJson(toStyle).c_str());
  onSelectorStateChangedFn_(shadowNode, fromStyle, toStyle, duration, delay);
}

} // namespace reanimated
