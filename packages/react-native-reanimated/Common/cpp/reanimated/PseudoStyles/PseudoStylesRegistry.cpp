#include <reanimated/PseudoStyles/PseudoStylesRegistry.h>

#include <react/debug/react_native_assert.h>

#include <string>
#include <utility>

namespace reanimated {

using namespace facebook::react;

PseudoStylesRegistry::PseudoStylesRegistry(
    PlatformAttachPseudoSelectorFunction attachFn,
    PlatformDetachPseudoSelectorFunction detachFn,
    std::shared_ptr<css::CSSTransitionsRegistry> cssTransitionsRegistry,
    std::shared_ptr<UpdatesRegistryManager> updatesRegistryManager)
    : attachFn_(std::move(attachFn)),
      detachFn_(std::move(detachFn)),
      cssTransitionsRegistry_(std::move(cssTransitionsRegistry)),
      updatesRegistryManager_(std::move(updatesRegistryManager)) {}

// static
std::array<folly::dynamic, (1u << kPseudoSelectorBits)> PseudoStylesRegistry::recomputeAllStyles(
    const TagEntry &entry) {
  const PseudoSelectorMask maxMask = (1u << kPseudoSelectorBits);
  std::array<folly::dynamic, (1u << kPseudoSelectorBits)> newPrecomputedStyles;

  for (PseudoSelectorMask mask = 0; mask < maxMask; ++mask) {
    folly::dynamic style = entry.defaults;

    for (const auto &[sel, data] : entry.selectors) {
      if (mask & (1u << static_cast<int>(sel))) {
        style.update(data.selectorStyle);
      }
    }

    newPrecomputedStyles[mask] = std::move(style);
  }

  return newPrecomputedStyles;
}

void PseudoStylesRegistry::registerPseudoStyles(
    Tag tag,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    const folly::dynamic &defaults,
    const std::vector<SelectorRegistration> &selectors) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());

  auto &entry = registry_[tag];
  entry.shadowNode = shadowNode;
  entry.defaults = defaults;
  std::vector<PseudoSelector> newSelectors;
  for (const auto &registration : selectors) {
    if (!entry.selectors.contains(registration.selector)) {
      newSelectors.push_back(registration.selector);
    }
    entry.selectors[registration.selector] = {registration.selectorStyle};
  }
  entry.precomputedStyles = recomputeAllStyles(entry);

  for (const auto selector : newSelectors) {
    attachFn_(
        tag,
        selector,
        [weakThis = std::weak_ptr<PseudoStylesRegistry>(shared_from_this()), tag, selector](bool isActive) {
          if (auto strongThis = weakThis.lock()) {
            strongThis->onSelectorStateChanged(tag, selector, isActive);
          }
        });
  }
}

void PseudoStylesRegistry::remove(Tag tag) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());

  auto it = registry_.find(tag);
  if (it == registry_.end()) {
    return;
  }
  TagEntry entry = std::move(it->second);
  registry_.erase(it);

  // The gesture listeners are going away, so an active selector would stay applied forever
  // (and its lock would keep filtering render transitions); run the deactivation transition
  // and drop the lock before detaching.
  if (entry.activeMask != 0) {
    cssTransitionsRegistry_->setPseudoLockedProperties(tag, {});
    if (entry.shadowNode) {
      const auto &fromStyle = entry.precomputedStyles[entry.activeMask];
      const auto &toStyle = entry.precomputedStyles[0];
      css::PropertyValueDynamicDiffsMap valueChanges;
      for (const auto &[propKey, toVal] : toStyle.items()) {
        const auto propName = propKey.asString();
        const folly::dynamic &fromVal = fromStyle.count(propName) ? fromStyle[propName] : toVal;
        valueChanges.emplace(propName, std::make_pair(fromVal, toVal));
      }
      cssTransitionsRegistry_->run(entry.shadowNode, valueChanges);
    }
  }

  for (const auto &[selector, data] : entry.selectors) {
    detachFn_(tag, selector);
  }
}

void PseudoStylesRegistry::onSelectorStateChanged(Tag tag, PseudoSelector selector, bool isActive) {
  auto lock = updatesRegistryManager_->lock();

  auto it = registry_.find(tag);
  if (it == registry_.end()) {
    return;
  }
  TagEntry &entry = it->second;

  const PseudoSelectorMask oldMask = entry.activeMask;
  const PseudoSelectorMask bit = 1u << static_cast<int>(selector);
  entry.activeMask = isActive ? (oldMask | bit) : (oldMask & ~bit);

  const auto shadowNode = entry.shadowNode;
  const auto &fromStyle = entry.precomputedStyles[oldMask];
  const auto &toStyle = entry.precomputedStyles[entry.activeMask];

  css::TransitionProperties lockedProperties;
  for (const auto &[sel, data] : entry.selectors) {
    if (!(entry.activeMask & (1u << static_cast<int>(sel)))) {
      continue;
    }
    for (const auto &[propKey, val] : data.selectorStyle.items()) {
      if (!val.isNull()) {
        lockedProperties.insert(propKey.asString());
      }
    }
  }
  cssTransitionsRegistry_->setPseudoLockedProperties(tag, lockedProperties);

  css::PropertyValueDynamicDiffsMap valueChanges;
  for (const auto &[propKey, toVal] : toStyle.items()) {
    const auto propName = propKey.asString();
    // Fallback only - the platform/loop prefer the live current value when one exists.
    const folly::dynamic &fromVal = fromStyle.count(propName) ? fromStyle[propName] : toVal;
    valueChanges.emplace(propName, std::make_pair(fromVal, toVal));
  }

  cssTransitionsRegistry_->run(shadowNode, valueChanges);
}

} // namespace reanimated
