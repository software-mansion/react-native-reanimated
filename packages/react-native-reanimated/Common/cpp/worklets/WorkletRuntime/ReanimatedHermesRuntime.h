#pragma once

// JS_RUNTIME_HERMES is only set on Android so we have to check __has_include
// on iOS.
#if __APPLE__ &&    \
    (__has_include( \
        <reacthermes/HermesExecutorFactory.h>) || __has_include(<hermes/hermes.h>))
#define JS_RUNTIME_HERMES 1
#endif

// Only include this file in Hermes-enabled builds as some platforms (like tvOS)
// don't support hermes and it causes the compilation to fail.
#if JS_RUNTIME_HERMES

#include <cxxreact/MessageQueueThread.h>
#include <cxxreact/SystraceSection.h>
#include <jsi/decorator.h>
#include <jsinspector-modern/InspectorFlags.h>

#include <atomic>
#include <memory>
#include <string>
#include <thread>

#if __has_include(<reacthermes/HermesExecutorFactory.h>)
#include <reacthermes/HermesExecutorFactory.h>
#else // __has_include(<hermes/hermes.h>) || ANDROID
#include <hermes/hermes.h>
#endif

#if HERMES_ENABLE_DEBUGGER
#include <hermes/inspector-modern/chrome/Registration.h>
#include <hermes/inspector-modern/chrome/HermesRuntimeTargetDelegate.h>
#include <hermes/inspector/RuntimeAdapter.h>
#endif // HERMES_ENABLE_DEBUGGER

namespace worklets {

using namespace facebook;
using namespace react;
#if HERMES_ENABLE_DEBUGGER
using namespace facebook::hermes::inspector_modern;
using namespace facebook::hermes;
using namespace facebook::jsi;
#endif // HERMES_ENABLE_DEBUGGER

#ifdef HERMES_ENABLE_DEBUGGER

class ReanimatedHermesExecutorRuntimeAdapter
    : public facebook::hermes::inspector_modern::RuntimeAdapter {
 public:
  ReanimatedHermesExecutorRuntimeAdapter(
      std::shared_ptr<HermesRuntime> runtime,
      std::shared_ptr<MessageQueueThread> thread)
      : runtime_(runtime), thread_(std::move(thread)) {}

  virtual ~ReanimatedHermesExecutorRuntimeAdapter() = default;

  HermesRuntime& getRuntime() override {
    return *runtime_;
  }

  void tickleJs() override {
    // thread_->runOnQueue(
    //     [weakRuntime = std::weak_ptr<HermesRuntime>(runtime_)]() {
    //       auto runtime = weakRuntime.lock();
    //       if (!runtime) {
    //         return;
    //       }
    //       jsi::Function func =
    //           runtime->global().getPropertyAsFunction(*runtime, "__tickleJs");
    //       func.call(*runtime);
    //     });
  }

 private:
  std::shared_ptr<HermesRuntime> runtime_;

  std::shared_ptr<MessageQueueThread> thread_;
};

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

// This adds ReentrancyCheck and debugger enable/teardown to the given
// Runtime.
class ReanimatedHermesRuntime : public jsi::WithRuntimeDecorator<ReanimatedReentrancyCheck> {
 public:
  // The first argument may be another decorater which itself
  // decorates the real HermesRuntime, depending on the build config.
  // The second argument is the real HermesRuntime as well to
  // manage the debugger registration.
  ReanimatedHermesRuntime(
      std::unique_ptr<Runtime> runtime,
      HermesRuntime& hermesRuntime,
      const std::shared_ptr<MessageQueueThread> &jsQueue,
      bool enableDebugger,
      const std::string& debuggerName)
      : jsi::WithRuntimeDecorator<ReanimatedReentrancyCheck>(*runtime, reentrancyCheck_),
        runtime_(std::move(runtime)) {
#ifdef HERMES_ENABLE_DEBUGGER
    enableDebugger_ = enableDebugger;
    if (enableDebugger_) {
      std::shared_ptr<HermesRuntime> rt(runtime_, &hermesRuntime);
      auto adapter =
          std::make_unique<ReanimatedHermesExecutorRuntimeAdapter>(rt, jsQueue);
      debugToken_ = facebook::hermes::inspector_modern::chrome::enableDebugging(
          std::move(adapter), debuggerName);
    }
#else
    (void)jsQueue;
#endif // HERMES_ENABLE_DEBUGGER

#ifndef NDEBUG
  facebook::hermes::HermesRuntime *wrappedRuntime = &hermesRuntime;
  jsi::Value evalWithSourceMap = jsi::Function::createFromHostFunction(
      *runtime_,
      jsi::PropNameID::forAscii(*runtime_, "evalWithSourceMap"),
      3,
      [wrappedRuntime](
          jsi::Runtime &rt,
          const jsi::Value &thisValue,
          const jsi::Value *args,
          size_t count) -> jsi::Value {
        auto code = std::make_shared<const jsi::StringBuffer>(
            args[0].asString(rt).utf8(rt));
        std::string sourceURL;
        if (count > 1 && args[1].isString()) {
          sourceURL = args[1].asString(rt).utf8(rt);
        }
        std::shared_ptr<const jsi::Buffer> sourceMap;
        if (count > 2 && args[2].isString()) {
          sourceMap = std::make_shared<const jsi::StringBuffer>(
              args[2].asString(rt).utf8(rt));
        }
        return wrappedRuntime->evaluateJavaScriptWithSourceMap(
            code, sourceMap, sourceURL);
      });
  runtime_->global().setProperty(
      *runtime_, "evalWithSourceMap", evalWithSourceMap);
#endif // NDEBUG
  }

  ~ReanimatedHermesRuntime() {
#ifdef HERMES_ENABLE_DEBUGGER
    if (enableDebugger_) {
      facebook::hermes::inspector_modern::chrome::disableDebugging(debugToken_);
    }
#endif // HERMES_ENABLE_DEBUGGER
  }

 private:
  // runtime_ is a potentially decorated Runtime.
  // hermesRuntime is a reference to a HermesRuntime managed by runtime_.
  //
  // HermesExecutorRuntimeAdapter requirements are kept, because the
  // dtor will disable debugging on the HermesRuntime before the
  // member managing it is destroyed.

  std::shared_ptr<Runtime> runtime_;
  ReanimatedReentrancyCheck reentrancyCheck_;
#ifdef HERMES_ENABLE_DEBUGGER
  bool enableDebugger_;
  facebook::hermes::inspector_modern::chrome::DebugSessionToken debugToken_;
#endif // HERMES_ENABLE_DEBUGGER
};

} // namespace worklets

#endif // JS_RUNTIME_HERMES
