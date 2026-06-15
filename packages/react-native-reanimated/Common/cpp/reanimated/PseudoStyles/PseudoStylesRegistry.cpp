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
  folly::dynamic mergedDefault = folly::dynamic::object();
  for (const auto &[sel, data] : entry.selectors) {
    mergedDefault.update(data.defaultStyle);
  }

  const PseudoSelectorMask maxMask = (1u << kPseudoSelectorBits);
  std::array<folly::dynamic, (1u << kPseudoSelectorBits)> newPrecomputedStyles;

  for (PseudoSelectorMask mask = 0; mask < maxMask; ++mask) {
    folly::dynamic style = mergedDefault;

    for (const auto &[sel, data] : entry.selectors) {
      if (mask & (1u << static_cast<int>(sel))) {
        style.update(data.selectorStyle);
      }
    }

    newPrecomputedStyles[mask] = std::move(style);
  }

  return newPrecomputedStyles;
}

void PseudoStylesRegistry::registerPseudoStyle(
    Tag tag,
    const std::shared_ptr<const ShadowNode> &shadowNode,
    PseudoSelector selector,
    const folly::dynamic &selectorStyle,
    const folly::dynamic &defaultStyle) {
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());

  auto &entry = registry_[tag];
  entry.shadowNode = shadowNode;
  entry.selectors[selector] = {selectorStyle, defaultStyle};
  entry.precomputedStyles = recomputeAllStyles(entry);

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
  react_native_assert(UpdatesRegistryManager::isLockedByCurrentThread());

  auto it = registry_.find(tag);
  if (it == registry_.end()) {
    return;
  }
  auto selectorsToDetach = std::move(it->second.selectors);
  registry_.erase(it);

  for (const auto &[selector, data] : selectorsToDetach) {
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

  css::PropertyValueDynamicDiffsMap valueChanges;
  for (const auto &[propKey, toVal] : toStyle.items()) {
    const auto propName = propKey.asString();
    const folly::dynamic &fromVal = fromStyle.count(propName) ? fromStyle[propName] : toVal;
    valueChanges.emplace(propName, std::make_pair(fromVal, toVal));
  }

  cssTransitionsRegistry_->run(shadowNode, valueChanges);
}

} // namespace reanimated
