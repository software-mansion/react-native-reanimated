#include <reanimated/PseudoStyles/PseudoStylesRegistry.h>

#include <folly/json.h>
#include <hermes/hermes.h>

#include <cstdio>
#include <utility>

namespace reanimated {

using namespace facebook::react;

PseudoStylesRegistry::PseudoStylesRegistry(
    PlatformAttachPseudoSelectorFunction attachFn,
    PlatformDetachPseudoSelectorFunction detachFn)
    : registryRuntime_(facebook::hermes::makeHermesRuntime()),
      attachFn_(std::move(attachFn)),
      detachFn_(std::move(detachFn)),
      onSelectorStateChangedFn_(
          [](jsi::Runtime &, const auto &, const auto &, const auto &, double, double, const auto &) {}) {}

void PseudoStylesRegistry::setOnSelectorStateChangedFn(OnSelectorStateChangedFn fn) {
  onSelectorStateChangedFn_ = std::move(fn);
}

// static
void PseudoStylesRegistry::recomputeAllStyles(TagEntry &entry) {
  folly::dynamic mergedDefault = folly::dynamic::object();
  for (const auto &[sel, data] : entry.selectors) {
    mergedDefault.update(data.defaultStyle);
  }

  const PseudoSelectorMask maxMask = (1u << kPseudoSelectorBits);

  for (PseudoSelectorMask mask = 0; mask < maxMask; ++mask) {
    folly::dynamic style = mergedDefault;

    for (const auto &[sel, data] : entry.selectors) {
      if (mask & (1u << static_cast<int>(sel))) {
        style.update(data.selectorStyle);
      }
    }

    entry.precomputedStyles[mask] = std::move(style);
  }
}

void PseudoStylesRegistry::registerPseudoStyle(
    Tag tag,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    PseudoSelector selector,
    const folly::dynamic &selectorStyle,
    const folly::dynamic &defaultStyle,
    double duration,
    double delay,
    css::EasingFunction easingFn) {
  {
    std::lock_guard<std::mutex> lock{mutex_};
    auto &entry = registry_[tag];
    entry.shadowNode = shadowNode;
    entry.duration = duration;
    entry.delay = delay;
    entry.easingFn = std::move(easingFn);
    entry.selectors[selector] = {selectorStyle, defaultStyle};
    recomputeAllStyles(entry);
  }

  attachFn_(
      tag,
      selector,
      [weakThis = std::weak_ptr<PseudoStylesRegistry>(shared_from_this()), tag, selector](bool isActive) {
        if (auto strongThis = weakThis.lock()) {
          strongThis->onSelectorStateChanged(tag, selector, isActive);
        }
      });
}

void PseudoStylesRegistry::remove(Tag tag) {
  std::map<PseudoSelector, SelectorData> selectorsCopy;
  {
    std::lock_guard<std::mutex> lock{mutex_};
    auto it = registry_.find(tag);
    if (it == registry_.end()) {
      return;
    }
    selectorsCopy = std::move(it->second.selectors);
    registry_.erase(it);
  }
  for (const auto &[selector, data] : selectorsCopy) {
    detachFn_(tag, selector);
  }
}

void PseudoStylesRegistry::onSelectorStateChanged(Tag tag, PseudoSelector selector, bool isActive) {
  std::shared_ptr<const ShadowNode> shadowNode;
  folly::dynamic fromStyle, toStyle;
  double duration, delay;
  css::EasingFunction easingFn;
  {
    std::lock_guard<std::mutex> lock{mutex_};
    auto it = registry_.find(tag);
    if (it == registry_.end()) {
      return;
    }
    TagEntry &entry = it->second;

    const PseudoSelectorMask oldMask = entry.activeMask;
    const PseudoSelectorMask bit = 1u << static_cast<int>(selector);
    entry.activeMask = isActive ? (oldMask | bit) : (oldMask & ~bit);

    fromStyle = entry.precomputedStyles[oldMask];
    toStyle = entry.precomputedStyles[entry.activeMask];

    shadowNode = entry.shadowNode;
    duration = entry.duration;
    delay = entry.delay;
    easingFn = entry.easingFn;
  }

  onSelectorStateChangedFn_(*registryRuntime_, shadowNode, fromStyle, toStyle, duration, delay, easingFn);
}

} // namespace reanimated
