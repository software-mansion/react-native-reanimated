#pragma once

#include <functional>
#include <memory>
#include <string>
#include <unordered_map>
#include "reanimated/LayoutAnimations/LayoutAnimationType.h"
#include "reanimated/LayoutAnimations/NativeLayoutAnimationPreset.h"

namespace reanimated {

class NativeLayoutAnimationPresetFactory {
 public:
  using PresetCreator =
      std::function<std::unique_ptr<NativeLayoutAnimationPreset>()>;

  static NativeLayoutAnimationPresetFactory &instance();

  void registerPreset(
      LayoutAnimationType type,
      const std::string &name,
      PresetCreator creator);

  std::unique_ptr<NativeLayoutAnimationPreset> create(
      LayoutAnimationType type,
      const std::string &name) const;

  NativeLayoutAnimationPresetFactory(
      const NativeLayoutAnimationPresetFactory &) = delete;
  NativeLayoutAnimationPresetFactory &operator=(
      const NativeLayoutAnimationPresetFactory &) = delete;

 private:
  NativeLayoutAnimationPresetFactory();
  ~NativeLayoutAnimationPresetFactory() = default;

  using PresetMap = std::unordered_map<std::string, PresetCreator>;

  PresetMap &getRegistry(LayoutAnimationType type);
  const PresetMap &getRegistry(LayoutAnimationType type) const;

  void registerBuiltInPresets();

  PresetMap enteringPresets_;
  PresetMap exitingPresets_;
  PresetMap layoutPresets_;
};

} // namespace reanimated