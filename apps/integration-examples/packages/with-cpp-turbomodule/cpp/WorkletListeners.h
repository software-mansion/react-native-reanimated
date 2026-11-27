#pragma once

#include <jsi/jsi.h>

#include <worklets/Compat/StableApi.h>

#include <memory>
#include <mutex>
#include <unordered_map>
#include <vector>

class WorkletListeners {
 public:
  int add(
      facebook::jsi::Runtime &rnRuntime,
      const facebook::jsi::Object &uiRuntimeHolder,
      const facebook::jsi::Object &uiSchedulerHolder,
      const facebook::jsi::Object &worklet) {
    Listener listener{
        worklets::getWorkletRuntimeFromHolder(rnRuntime, uiRuntimeHolder),
        worklets::getUISchedulerFromHolder(rnRuntime, uiSchedulerHolder),
        worklets::extractSerializable(
            rnRuntime,
            facebook::jsi::Value(rnRuntime, worklet),
            "[with-cpp-turbomodule] The counter listener must be a worklet.",
            worklets::Serializable::ValueType::WorkletType)};
    std::lock_guard lock(mutex_);
    listeners_.emplace(++lastId_, std::move(listener));
    return lastId_;
  }

  void remove(int id) {
    std::lock_guard lock(mutex_);
    listeners_.erase(id);
  }

  void dispatch(int count) {
    for (const auto &listener : snapshot()) {
      worklets::scheduleOnUI(listener.uiScheduler, [uiRuntime = listener.uiRuntime, worklet = listener.worklet, count] {
        if (auto runtime = uiRuntime.lock()) {
          worklets::runSyncOnRuntime(runtime, worklet, facebook::jsi::Value(count));
        }
      });
    }
  }

 private:
  struct Listener {
    std::weak_ptr<worklets::WorkletRuntime> uiRuntime;
    std::shared_ptr<worklets::UIScheduler> uiScheduler;
    std::shared_ptr<worklets::Serializable> worklet;
  };

  std::vector<Listener> snapshot() {
    std::lock_guard lock(mutex_);
    std::vector<Listener> listeners;
    for (const auto &[id, listener] : listeners_) {
      listeners.push_back(listener);
    }
    return listeners;
  }

  std::mutex mutex_;
  int lastId_ = 0;
  std::unordered_map<int, Listener> listeners_;
};
