#pragma once

#include <jsi/jsi.h>
#include <stdio.h>
#include <functional>
#include <map>
#include <memory>

namespace reanimated {

using namespace facebook;

class MutableValue;
class ShareableValue;

class LayoutAnimationsProxy {
 public:
  LayoutAnimationsProxy(
      std::function<void(int, jsi::Object newProps)> _notifyAboutProgress,
      std::function<void(int, bool)> _notifyAboutEnd);

  void startObserving(int tag, std::shared_ptr<MutableValue> sv, jsi::Runtime &rt);
  void stopObserving(int tag, bool finished);
  void notifyAboutCancellation(int tag);
  void configureAnimation(int tag, const std::string& type, std::shared_ptr<ShareableValue> config);
  bool hasLayoutAnimation(int tag, const std::string& type);
  void startLayoutAnimation(jsi::Runtime &rt, int tag, const std::string& type, const jsi::Object &values);

 private:
  std::function<void(int, jsi::Object newProps)> notifyAboutProgress;
  std::function<void(int, bool)> notifyAboutEnd;
  std::map<int, std::shared_ptr<MutableValue>> observedValues;
  std::map<int, std::shared_ptr<ShareableValue>> enteringAnimations;
  std::map<int, std::shared_ptr<ShareableValue>> exitingAnimations;
  std::map<int, std::shared_ptr<ShareableValue>> layoutAnimations;
};

} // namespace reanimated
