#pragma once

#include <jsi/jsi.h>
#include <react/renderer/core/ReactPrimitives.h>

#include <stdio.h>
#include <functional>
#include <map>
#include <memory>
#include <set>

namespace reanimated {

using namespace facebook;
using namespace react;

class MutableValue;

class LayoutAnimationsProxy {
 public:
  LayoutAnimationsProxy(
      std::function<void(int, jsi::Object newProps)> _notifyAboutProgress,
      std::function<void(int, bool)> _notifyAboutEnd);

  void
  startObserving(int tag, std::shared_ptr<MutableValue> sv, jsi::Runtime &rt);
  void stopObserving(int tag, bool finished);
  void notifyAboutCancellation(int tag);

  std::set<Tag> tagsOfCreatedViews_;
  std::set<Tag> tagsOfUpdatedViews_;
  std::set<Tag> tagsOfRemovedViews_;

 private:
  std::function<void(int, jsi::Object newProps)> notifyAboutProgress;
  std::function<void(int, bool)> notifyAboutEnd;
  std::map<int, std::shared_ptr<MutableValue>> observedValues;
};

} // namespace reanimated
