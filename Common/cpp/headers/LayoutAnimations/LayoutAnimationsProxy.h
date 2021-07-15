#pragma once

#include <stdio.h>
#include <memory>
#include <functional>
#include <map>
#include <jsi/jsi.h>

namespace reanimated {

using namespace facebook;

class MutableValue;

class LayoutAnimationsProxy {
  
public:
  LayoutAnimationsProxy(std::function<void(int, jsi::Object newProps)> _notifyAboutProgress, std::function<void(int, bool)> _notifyAboutEnd);
  
  void startObserving(int tag, std::shared_ptr<MutableValue> sv, jsi::Runtime &rt);
  void stopObserving(int tag, bool finished);
  void notifyAboutCancellation(int tag);
  
private:
  std::function<void(int, jsi::Object newProps)> notifyAboutProgress;
  std::function<void(int, bool)> notifyAboutEnd;
  std::map<int, std::shared_ptr<MutableValue>> observedValues;
};

}

