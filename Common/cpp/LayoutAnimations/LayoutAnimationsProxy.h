#pragma once

#include <ErrorHandler.h>
#include <jsi/jsi.h>
#include <stdio.h>
#include <functional>
#include <memory>
#include <mutex>
#include <string>
#include <unordered_map>

namespace reanimated {

using namespace facebook;

class MutableValue;
class ShareableValue;

class LayoutAnimationsProxy {
 public:
  LayoutAnimationsProxy(
      std::function<void(int, jsi::Object newProps)>
          layoutAnimationProgressHandler,
      std::function<void(int, jsi::Object newProps)>
          sharedTransitionProgressHandler,
      std::function<void(int, bool, bool)> endHandler,
      std::weak_ptr<ErrorHandler> errorHandler);

  void startObserving(
      int tag,
      std::shared_ptr<MutableValue> sv,
      const std::string &type,
      jsi::Runtime &rt);
  void stopObserving(int tag, bool finished, bool removeView);
  void configureAnimation(
      int tag,
      const std::string &type,
      std::shared_ptr<ShareableValue> config,
      std::shared_ptr<ShareableValue> viewSharedValue);
  bool hasLayoutAnimation(int tag, const std::string &type);
  void startLayoutAnimation(
      jsi::Runtime &rt,
      int tag,
      const std::string &type,
      const jsi::Object &values);
  void clearLayoutAnimationConfig(int tag, bool force = false);

 private:
  std::function<void(int, jsi::Object newProps)>
      layoutAnimationProgressHandler_;
  std::function<void(int, jsi::Object newProps)>
      sharedTransitionProgressHandler_;
  std::function<void(int, bool, bool)> endHandler_;
  std::weak_ptr<ErrorHandler> weakErrorHandler_;
  std::unordered_map<int, std::shared_ptr<MutableValue>> observedValues;
  std::unordered_map<int, std::shared_ptr<ShareableValue>> viewSharedValues;
  std::unordered_map<int, std::shared_ptr<ShareableValue>> enteringAnimations;
  std::unordered_map<int, std::shared_ptr<ShareableValue>> exitingAnimations;
  std::unordered_map<int, std::shared_ptr<ShareableValue>> layoutAnimations;
  std::unordered_map<int, std::shared_ptr<ShareableValue>>
      sharedTransitionAnimations;
  mutable std::mutex
      animationsMutex_; // Protects `enteringAnimations_`, `exitingAnimations_`,
                        // `layoutAnimations_` and `viewSharedValues_`.
};

} // namespace reanimated
