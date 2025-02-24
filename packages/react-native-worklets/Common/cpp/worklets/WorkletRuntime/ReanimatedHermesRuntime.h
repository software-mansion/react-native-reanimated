#pragma once

#include <worklets/Tools/Defs.h>

// Only include this file in Hermes-enabled builds as some platforms (like tvOS)
// don't support hermes and it causes the compilation to fail.
#if JS_RUNTIME_HERMES

#include <cxxreact/MessageQueueThread.h>
#include <hermes/hermes.h>
#include <jsi/decorator.h>
#include <jsi/jsi.h>

#include <atomic>
#include <memory>
#include <string>
#include <thread>

#if HERMES_ENABLE_DEBUGGER
#include <hermes/inspector-modern/chrome/Registration.h>
#endif // HERMES_ENABLE_DEBUGGER

namespace worklets {

using namespace facebook;
using namespace react;
#if HERMES_ENABLE_DEBUGGER
using namespace facebook::hermes::inspector_modern;
#endif // HERMES_ENABLE_DEBUGGER

// ReentrancyCheck is copied from React Native
// from ReactCommon/hermes/executor/HermesExecutorFactory.cpp
// https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/hermes/executor/HermesExecutorFactory.cpp
struct ReanimatedReentrancyCheck {
  // This is effectively a very subtle and complex assert, so only
  // include it in builds which would include asserts.
#ifndef NDEBUG
  ReanimatedReentrancyCheck() : tid(std::thread::id()), depth(0) {}

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
      assert(depth == 0 && "[Reanimated] No thread id, but depth != 0");
      ++depth;
    } else if (expected == this_id) {
      // If the stored tid referred to a thread, expected was set to
      // that value.  If that value is this thread's tid, that's ok,
      // just increment depth again.
      assert(depth != 0 && "[Reanimated] Thread id was set, but depth == 0");
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
        "[Reanimated] No thread id in after()");
    if (--depth == 0) {
      // If we decremented depth to zero, store no-thread into tid.
      std::thread::id expected = std::this_thread::get_id();
      bool didWrite = tid.compare_exchange_strong(
          expected, std::thread::id(), std::memory_order_relaxed);
      assert(didWrite && "[Reanimated] Decremented to zero, but no tid write");
    }
  }

  std::atomic<std::thread::id> tid;
  // This is not atomic, as it is only written or read from the owning
  // thread.
  unsigned int depth;
#endif // NDEBUG
};

// This is in fact a subclass of jsi::Runtime! WithRuntimeDecorator is a
// template class that is a subclass of DecoratedRuntime which is also a
// template class that then inherits its template, which in this case is
// jsi::Runtime. So the inheritance is: ReanimatedHermesRuntime ->
// WithRuntimeDecorator -> DecoratedRuntime -> jsi::Runtime You can find out
// more about this in ReactCommon/jsi/jsi/Decorator.h or by following this link:
// https://github.com/facebook/react-native/blob/main/packages/react-native/ReactCommon/jsi/jsi/decorator.h
class ReanimatedHermesRuntime
    : public jsi::WithRuntimeDecorator<ReanimatedReentrancyCheck> {
 public:
  ReanimatedHermesRuntime(
      std::unique_ptr<facebook::hermes::HermesRuntime> runtime,
      const std::shared_ptr<MessageQueueThread> &jsQueue,
      const std::string &name);
  ~ReanimatedHermesRuntime();

 private:
  std::unique_ptr<facebook::hermes::HermesRuntime> runtime_;
  ReanimatedReentrancyCheck reentrancyCheck_;
#if HERMES_ENABLE_DEBUGGER
  chrome::DebugSessionToken debugToken_;
#endif // HERMES_ENABLE_DEBUGGER
};

} // namespace worklets

#endif // JS_RUNTIME_HERMES
