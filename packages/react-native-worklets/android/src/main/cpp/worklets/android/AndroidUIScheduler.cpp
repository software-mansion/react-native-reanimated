#include <worklets/android/AndroidUIScheduler.h>

#include <atomic>
#include <mutex>
#include <unordered_set>
#include <utility>

namespace worklets {

using namespace facebook;
using namespace react;

namespace {
// Per-thread set of scheduler IDs whose UI thread is this thread. Scoped per
// instance (via monotonic integer ID, not pointer) so that multiple
// schedulers do not collide and a destroyed scheduler's stale ID cannot
// match a fresh allocation at the same address.
std::atomic<uint64_t> s_nextSchedulerId{1};
thread_local std::unordered_set<uint64_t> tls_uiThreadSchedulerIds;
} // namespace

class UISchedulerWrapper : public UIScheduler {
 private:
  const uint64_t id_;
  std::mutex mutex_;
  jni::global_ref<AndroidUIScheduler::javaobject> androidUiScheduler_;

 public:
  explicit UISchedulerWrapper(jni::global_ref<AndroidUIScheduler::javaobject> androidUiScheduler)
      : id_(s_nextSchedulerId.fetch_add(1, std::memory_order_relaxed)),
        androidUiScheduler_(std::move(androidUiScheduler)) {}

  void scheduleOnUI(std::function<void()> job) override {
    if (tls_uiThreadSchedulerIds.count(id_) > 0) {
      job();
      return;
    }
    UIScheduler::scheduleOnUI(job);
    if (!scheduledOnUI_) {
      scheduledOnUI_ = true;
      std::lock_guard<std::mutex> lock(mutex_);
      if (androidUiScheduler_) {
        androidUiScheduler_->cthis()->scheduleTriggerOnUI();
      }
    }
  }

  void triggerUI() override {
    tls_uiThreadSchedulerIds.insert(id_);
    UIScheduler::triggerUI();
  }

  void invalidate() {
    std::lock_guard<std::mutex> lock(mutex_);
    androidUiScheduler_.reset();
  }
};

AndroidUIScheduler::AndroidUIScheduler(const jni::alias_ref<AndroidUIScheduler::jhybridobject> &jThis)
    : javaPart_(jni::make_global(jThis)), uiScheduler_(std::make_shared<UISchedulerWrapper>(jni::make_global(jThis))) {}

jni::local_ref<AndroidUIScheduler::jhybriddata> AndroidUIScheduler::initHybrid(
    jni::alias_ref<jhybridobject> jThis) { // NOLINT //(performance-unnecessary-value-param)
  return makeCxxInstance(jThis);
}

void AndroidUIScheduler::triggerUI() {
  if (!uiScheduler_) {
    return;
  }
  uiScheduler_->triggerUI();
}

void AndroidUIScheduler::scheduleTriggerOnUI() {
  if (!javaPart_) {
    return;
  }
  static const auto method = javaPart_->getClass()->getMethod<void()>("scheduleTriggerOnUI");
  method(javaPart_.get());
}

void AndroidUIScheduler::invalidate() {
  // Drop the wrapper's global ref to this AndroidUIScheduler so consumers
  // (WorkletRuntimes, async queues) that still hold the wrapper don't keep
  // the Java side alive past invalidation. The wrapper internally guards
  // against post-invalidate JNI calls.
  if (uiScheduler_) {
    static_cast<UISchedulerWrapper *>(uiScheduler_.get())->invalidate();
  }
  javaPart_ = nullptr;
  uiScheduler_.reset();
}

void AndroidUIScheduler::registerNatives() {
  registerHybrid({
      makeNativeMethod("initHybrid", AndroidUIScheduler::initHybrid),
      makeNativeMethod("triggerUI", AndroidUIScheduler::triggerUI),
      makeNativeMethod("invalidate", AndroidUIScheduler::invalidate),
  });
}

} // namespace worklets
