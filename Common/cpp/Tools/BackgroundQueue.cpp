#include "BackgroundQueue.h"

#include <utility>

namespace reanimated {

BackgroundQueue::BackgroundQueue(const std::string &name) : name_(name) {
  thread_ = std::thread([this] { runLoop(); });
}

BackgroundQueue::~BackgroundQueue() {
  running_ = false;
  cv_.notify_all();
  thread_.join();
}

jsi::Value BackgroundQueue::get(
    jsi::Runtime &rt,
    const jsi::PropNameID &propName) {
  auto name = propName.utf8(rt);
  if (name == "toString") {
    return jsi::Function::createFromHostFunction(
        rt,
        propName,
        0,
        [this](jsi::Runtime &rt, const jsi::Value &, const jsi::Value *, size_t)
            -> jsi::Value {
          return jsi::String::createFromUtf8(rt, toString());
        });
  }
  if (name == "name") {
    return jsi::String::createFromUtf8(rt, name_);
  }
  return jsi::Value::undefined();
}

std::vector<jsi::PropNameID> BackgroundQueue::getPropertyNames(
    jsi::Runtime &rt) {
  std::vector<jsi::PropNameID> result;
  result.push_back(jsi::PropNameID::forUtf8(rt, "toString"));
  result.push_back(jsi::PropNameID::forUtf8(rt, "name"));
  return result;
}

void BackgroundQueue::push(
    const std::shared_ptr<WorkletRuntime> &runtime,
    const std::shared_ptr<ShareableWorklet> &worklet) {
  std::unique_lock<std::mutex> lock(mutex_);
  queue_.emplace(runtime, worklet);
  cv_.notify_one();
}

void BackgroundQueue::runLoop() {
  pthread_setname_np(name_.c_str());
  while (running_) {
    std::unique_lock<std::mutex> lock(mutex_);
    cv_.wait(lock, [this] { return !queue_.empty() || !running_; });
    if (!running_) {
      return;
    }
    if (!queue_.empty()) {
      auto [workletRuntime, shareableWorklet] = std::move(queue_.front());
      queue_.pop();
      lock.unlock();
      workletRuntime->runGuarded(shareableWorklet);
    }
  }
}

} // namespace reanimated
