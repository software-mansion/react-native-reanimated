#pragma once

#include <hermes/hermes.h>
#include <hermes/inspector/RuntimeAdapter.h>
#include <hermes/inspector/chrome/Registration.h>
#include <memory>

#include <cxxreact/MessageQueueThread.h>

#include <jsi/decorator.h>

namespace reanimated {

using namespace facebook;
using namespace react;

class HermesExecutorRuntimeAdapter
    : public facebook::hermes::inspector::RuntimeAdapter {
 public:
  HermesExecutorRuntimeAdapter(
      std::shared_ptr<facebook::jsi::Runtime> runtime,
      facebook::hermes::HermesRuntime &hermesRuntime,
      std::shared_ptr<MessageQueueThread> thread)
      : runtime_(runtime),
        hermesRuntime_(hermesRuntime),
        thread_(std::move(thread)) {}

  virtual ~HermesExecutorRuntimeAdapter(){};

  facebook::jsi::Runtime &getRuntime() override {
    return *runtime_;
  }

  facebook::hermes::debugger::Debugger &getDebugger() override {
    return hermesRuntime_.getDebugger();
  }

  void tickleJs() override {
    // The queue will ensure that runtime_ is still valid when this
    // gets invoked.
    thread_->runOnQueue([&runtime = runtime_]() {
      auto func =
          runtime->global().getPropertyAsFunction(*runtime, "__tickleJs");
      func.call(*runtime);
    });
  }

 public:
  std::shared_ptr<facebook::jsi::Runtime> runtime_;
  facebook::hermes::HermesRuntime &hermesRuntime_;
  std::shared_ptr<MessageQueueThread> thread_;
};

struct ReentrancyCheck {
// This is effectively a very subtle and complex assert, so only
// include it in builds which would include asserts.
#ifndef NDEBUG
  ReentrancyCheck() : tid(std::thread::id()), depth(0) {}

  void before() {
    std::thread::id this_id = std::this_thread::get_id();
    std::thread::id expected = std::thread::id();

    // A note on memory ordering: the main purpose of these checks is
    // to observe a before/before race, without an intervening after.
    // This will be detected by the compare_exchange_strong atomicity
    // properties, regardless of memory order.
    //
    // For everything else, it is easiest to think of 'depth' as a
    // proxy for any access made inside the VM.  If access to depth
    // are reordered incorrectly, the same could be true of any other
    // operation made by the VM.  In fact, using acquire/release
    // memory ordering could create barriers which mask a programmer
    // error.  So, we use relaxed memory order, to avoid masking
    // actual ordering errors.  Although, in practice, ordering errors
    // of this sort would be surprising, because the decorator would
    // need to call after() without before().

    if (tid.compare_exchange_strong(
            expected, this_id, std::memory_order_relaxed)) {
      // Returns true if tid and expected were the same.  If they
      // were, then the stored tid referred to no thread, and we
      // atomically saved this thread's tid.  Now increment depth.
      assert(depth == 0 && "No thread id, but depth != 0");
      ++depth;
    } else if (expected == this_id) {
      // If the stored tid referred to a thread, expected was set to
      // that value.  If that value is this thread's tid, that's ok,
      // just increment depth again.
      assert(depth != 0 && "Thread id was set, but depth == 0");
      ++depth;
    } else {
      // The stored tid was some other thread.  This indicates a bad
      // programmer error, where VM methods were called on two
      // different threads unsafely.  Fail fast (and hard) so the
      // crash can be analyzed.
      __builtin_trap();
    }
  }

  void after() {
    assert(
        tid.load(std::memory_order_relaxed) == std::this_thread::get_id() &&
        "No thread id in after()");
    if (--depth == 0) {
      // If we decremented depth to zero, store no-thread into tid.
      std::thread::id expected = std::this_thread::get_id();
      bool didWrite = tid.compare_exchange_strong(
          expected, std::thread::id(), std::memory_order_relaxed);
      assert(didWrite && "Decremented to zero, but no tid write");
    }
  }

  std::atomic<std::thread::id> tid;
  // This is not atomic, as it is only written or read from the owning
  // thread.
  unsigned int depth;
#endif
};

class ReanimatedDecoratedRuntime : jsi::WithRuntimeDecorator<ReentrancyCheck> {
 public:
  ReanimatedDecoratedRuntime(
      std::unique_ptr<facebook::jsi::Runtime> runtime,
      facebook::hermes::HermesRuntime &hermesRuntime,
      std::shared_ptr<MessageQueueThread> jsQueue)
      : jsi::WithRuntimeDecorator<ReentrancyCheck>(*runtime, reentrancyCheck_),
        runtime_(std::move(runtime)),
        hermesRuntime_(hermesRuntime) {
#if HERMES_ENABLE_DEBUGGER
    auto adapter = std::make_unique<HermesExecutorRuntimeAdapter>(
        runtime_, hermesRuntime_, jsQueue);
    facebook::hermes::inspector::chrome::enableDebugging(
        std::move(adapter), "Reanimated runtime");
#endif
  }

  ~ReanimatedDecoratedRuntime() {
#if HERMES_ENABLE_DEBUGGER
    facebook::hermes::inspector::chrome::disableDebugging(hermesRuntime_);
#endif
  }

  std::shared_ptr<Runtime> getRuntime() {
    return runtime_;
  }

 private:
  std::shared_ptr<Runtime> runtime_;
  facebook::hermes::HermesRuntime &hermesRuntime_;
  ReentrancyCheck reentrancyCheck_;
};

} // namespace reanimated