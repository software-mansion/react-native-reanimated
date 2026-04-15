#include "reanimated/LayoutAnimations/NativeLayoutAnimationPresetFactory.h"
#include <stdexcept>
#include "reanimated/LayoutAnimations/NativeLayoutAnimationPresetImpl.h"

namespace reanimated {

NativeLayoutAnimationPresetFactory &
NativeLayoutAnimationPresetFactory::instance() {
  static NativeLayoutAnimationPresetFactory factory;
  return factory;
}

NativeLayoutAnimationPresetFactory::NativeLayoutAnimationPresetFactory() {
  registerBuiltInPresets();
}

void NativeLayoutAnimationPresetFactory::registerPreset(
    LayoutAnimationType type,
    const std::string &name,
    PresetCreator creator) {
  getRegistry(type)[name] = std::move(creator);
}

std::unique_ptr<NativeLayoutAnimationPreset>
NativeLayoutAnimationPresetFactory::create(
    LayoutAnimationType type,
    const std::string &name) const {
  const auto &registry = getRegistry(type);
  auto it = registry.find(name);
  if (it == registry.end()) {
    throw std::runtime_error(
        "Unknown preset '" + name + "' for the given layout animation type");
  }
  return it->second();
}

NativeLayoutAnimationPresetFactory::PresetMap &
NativeLayoutAnimationPresetFactory::getRegistry(LayoutAnimationType type) {
  switch (type) {
    case LayoutAnimationType::ENTERING:
      return enteringPresets_;
    case LayoutAnimationType::EXITING:
      return exitingPresets_;
    case LayoutAnimationType::LAYOUT:
      return layoutPresets_;
  }
  throw std::runtime_error("Invalid animation type");
}

const NativeLayoutAnimationPresetFactory::PresetMap &
NativeLayoutAnimationPresetFactory::getRegistry(
    LayoutAnimationType type) const {
  return const_cast<NativeLayoutAnimationPresetFactory *>(this)->getRegistry(
      type);
}

void NativeLayoutAnimationPresetFactory::registerBuiltInPresets() {
  // ENTERING presets
  registerPreset(LayoutAnimationType::ENTERING, "SlideInLeft", []() {
    return std::make_unique<SlideInLeftPreset>();
  });

  // EXITING presets
  registerPreset(LayoutAnimationType::EXITING, "SlideOutRight", []() {
    return std::make_unique<SlideOutRightPreset>();
  });

  // LAYOUT presets
  registerPreset(LayoutAnimationType::LAYOUT, "LinearTransition", []() {
    return std::make_unique<LinearTransitionPreset>();
  });
}

} // namespace reanimated
