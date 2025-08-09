#pragma once

#include <reanimated/LayoutAnimations/LayoutAnimationType.h>

#include <worklets/SharedItems/Serializable.h>
#include <worklets/Tools/JSLogger.h>

#include <jsi/jsi.h>
#include <stdio.h>
#include <functional>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

namespace reanimated {

using namespace facebook;
using namespace worklets;

struct LayoutAnimationConfig {
  int tag;
  LayoutAnimationType type;
  std::shared_ptr<Serializable> config;
};

class LayoutAnimationsManager {
 public:
  explicit LayoutAnimationsManager(const std::shared_ptr<JSLogger> &jsLogger)
      : jsLogger_(jsLogger) {}
  void configureAnimationBatch(
      const std::vector<LayoutAnimationConfig> &layoutAnimationsBatch);
  void setShouldAnimateExiting(const int tag, const bool value);
  bool shouldAnimateExiting(const int tag, const bool shouldAnimate);
  bool hasLayoutAnimation(const int tag, const LayoutAnimationType type);
  void startLayoutAnimation(
      jsi::Runtime &rt,
      const int tag,
      const LayoutAnimationType type,
      const jsi::Object &values);
  void clearLayoutAnimationConfig(const int tag);
  void cancelLayoutAnimation(jsi::Runtime &rt, const int tag) const;
  void transferConfigFromNativeID(const int nativeId, const int tag);

 private:
  std::unordered_map<int, std::shared_ptr<Serializable>> &getConfigsForType(
      const LayoutAnimationType type);

  std::shared_ptr<JSLogger> jsLogger_;

  std::unordered_map<int, std::shared_ptr<Serializable>>
      enteringAnimationsForNativeID_;
  std::unordered_map<int, std::shared_ptr<Serializable>> enteringAnimations_;
  std::unordered_map<int, std::shared_ptr<Serializable>> exitingAnimations_;
  std::unordered_map<int, std::shared_ptr<Serializable>> layoutAnimations_;
  std::unordered_map<int, bool> shouldAnimateExitingForTag_;
  mutable std::recursive_mutex
      animationsMutex_; // Protects `enteringAnimations_`, `exitingAnimations_`,
  // `layoutAnimations_` and `shouldAnimateExitingForTag_`.
};

} // namespace reanimated
