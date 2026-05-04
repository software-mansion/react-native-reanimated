#include <reanimated/PseudoStyles/PseudoStylesRegistry.h>

#include <string>
#include <utility>

namespace reanimated {

using namespace facebook::react;

PseudoStylesRegistry::PseudoStylesRegistry(
    PlatformAttachPseudoSelectorFunction attachFn,
    PlatformDetachPseudoSelectorFunction detachFn,
    std::shared_ptr<css::CSSTransitionsRegistry> cssTransitionsRegistry)
    : attachFn_(std::move(attachFn)),
      detachFn_(std::move(detachFn)),
      cssTransitionsRegistry_(std::move(cssTransitionsRegistry)) {}

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
    const folly::dynamic &defaultStyle) {
  {
    std::lock_guard<std::mutex> lock{mutex_};
    auto &entry = registry_[tag];
    entry.shadowNode = shadowNode;
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

  auto lock = cssTransitionsRegistry_->lock();
  cssTransitionsRegistry_->remove(tag);
}

void PseudoStylesRegistry::onSelectorStateChanged(Tag tag, PseudoSelector selector, bool isActive) {
  folly::dynamic fromStyle;
  folly::dynamic toStyle;
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
  }

  std::unordered_map<std::string, std::pair<folly::dynamic, folly::dynamic>> valueChanges;
  for (const auto &[propKey, toVal] : toStyle.items()) {
    const auto propName = propKey.asString();
    const folly::dynamic &fromVal = fromStyle.count(propName) ? fromStyle[propName] : toVal;
    valueChanges.emplace(propName, std::make_pair(fromVal, toVal));
  }

  auto lock = cssTransitionsRegistry_->lock();
  cssTransitionsRegistry_->trigger(tag, static_cast<int>(selector), std::move(valueChanges));
}

} // namespace reanimated
