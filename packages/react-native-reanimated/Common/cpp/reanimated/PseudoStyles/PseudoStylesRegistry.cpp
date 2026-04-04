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

// static
void PseudoStylesRegistry::recomputeAllStyles(TagEntry &entry) {
  // Build merged default (last writer wins).
  folly::dynamic mergedDefault = folly::dynamic::object();
  for (const auto &[sel, data] : entry.selectors) {
    for (const auto &[key, val] : data.defaultStyle.items()) {
      mergedDefault[key] = val;
    }
  }

  for (uint8_t mask = 0; mask < (1u << std::size(kPriorityOrder)); ++mask) {
    folly::dynamic style = mergedDefault;
    for (PseudoSelector sel : kPriorityOrder) {
      if (mask & (1u << static_cast<int>(sel))) {
        if (auto it = entry.selectors.find(sel); it != entry.selectors.end()) {
          for (const auto &[key, val] : it->second.selectorStyle.items()) {
            style[key] = val;
          }
        }
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
    double delay) {
  // fprintf(
  //     stderr,
  //     "[PseudoStylesRegistry] registerPseudoStyle tag=%d selector=%d duration=%.0fms\n",
  //     tag,
  //     static_cast<int>(selector),
  //     duration);
  {
    std::lock_guard<std::mutex> lock{mutex_};
    auto &entry = registry_[tag];
    entry.shadowNode = shadowNode;
    entry.duration = duration;
    entry.delay = delay;
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
  // fprintf(
  //     stderr,
  //     "[PseudoStylesRegistry] onSelectorStateChanged tag=%d selector=%d isActive=%d\n",
  //     tag,
  //     static_cast<int>(selector),
  //     isActive);

  std::shared_ptr<const ShadowNode> shadowNode;
  folly::dynamic fromStyle, toStyle;
  double duration, delay;
  {
    std::lock_guard<std::mutex> lock{mutex_};
    auto it = registry_.find(tag);
    if (it == registry_.end()) {
      // fprintf(stderr, "[PseudoStylesRegistry] tag=%d not found in registry!\n", tag);
      return;
    }
    TagEntry &entry = it->second;

    const uint8_t oldMask = entry.activeMask;
    const uint8_t bit = 1u << static_cast<int>(selector);
    entry.activeMask = isActive ? (oldMask | bit) : (oldMask & ~bit);

    fromStyle = entry.precomputedStyles[oldMask];
    toStyle = entry.precomputedStyles[entry.activeMask];

    shadowNode = entry.shadowNode;
    duration = entry.duration;
    delay = entry.delay;
  }

  // fprintf(stderr, "[PseudoStylesRegistry] applying style: %s\n", folly::toJson(toStyle).c_str());
  onSelectorStateChangedFn_(shadowNode, fromStyle, toStyle, duration, delay);
}

} // namespace reanimated
