#pragma once

#include <fbjni/fbjni.h>
#include <jsi/jsi.h>
#include <react/jni/CxxModuleWrapper.h>
#include <react/jni/JMessageQueueThread.h>
#include <react/jni/WritableNativeMap.h>
#include "NativeReanimatedModule.h"
#include <ReactCommon/CallInvokerHolder.h>
#include <react/jni/JavaScriptExecutorHolder.h>
#include <memory>
#include <unordered_map>


#include "Scheduler.h"
#include "AndroidScheduler.h"

#include <cxxreact/MessageQueueThread.h>
#include <cxxreact/SystraceSection.h>
#include <hermes/hermes.h>
#include <jsi/decorator.h>

#include <hermes/inspector/RuntimeAdapter.h>
#include <hermes/inspector/chrome/Registration.h>

namespace reanimated {

using namespace facebook;

class HermesExecutorRuntimeAdapter : public facebook::hermes::inspector::RuntimeAdapter {
 public:
  HermesExecutorRuntimeAdapter(
      std::shared_ptr<facebook::jsi::Runtime> runtime,
      facebook::hermes::HermesRuntime &hermesRuntime,
      std::shared_ptr<MessageQueueThread> thread)
      : runtime_(runtime),
        hermesRuntime_(hermesRuntime),
        thread_(std::move(thread)) {}

  virtual ~HermesExecutorRuntimeAdapter() = default;

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

class AnimationFrameCallback : public HybridClass<AnimationFrameCallback> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/reanimated/NativeProxy$AnimationFrameCallback;";

  void onAnimationFrame(double timestampMs) {
    callback_(timestampMs);
  }

  static void registerNatives() {
    javaClassStatic()->registerNatives({
        makeNativeMethod("onAnimationFrame", AnimationFrameCallback::onAnimationFrame),
    });
  }

 private:
  friend HybridBase;

  AnimationFrameCallback(std::function<void(double)> callback)
      : callback_(std::move(callback)) {}

  std::function<void(double)> callback_;
};


class EventHandler : public HybridClass<EventHandler> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/reanimated/NativeProxy$EventHandler;";

  void receiveEvent(
     jni::alias_ref<JString> eventKey,
     jni::alias_ref<react::WritableMap> event) {
     std::string eventAsString = "{NativeMap:null}";
     if (event != nullptr) {
        eventAsString = event->toString();
     }
    handler_(eventKey->toString(), eventAsString);
  }

  static void registerNatives() {
    javaClassStatic()->registerNatives({
        makeNativeMethod("receiveEvent", EventHandler::receiveEvent),
    });
  }

 private:
  friend HybridBase;

  EventHandler(std::function<void(std::string,std::string)> handler)
      : handler_(std::move(handler)) {}

  std::function<void(std::string,std::string)> handler_;
};


class NativeProxy : public jni::HybridClass<NativeProxy> {
 public:
  static auto constexpr kJavaDescriptor =
      "Lcom/swmansion/reanimated/NativeProxy;";
  static jni::local_ref<jhybriddata> initHybrid(
        jni::alias_ref<jhybridobject> jThis,
        jlong jsContext,
        jni::alias_ref<facebook::react::CallInvokerHolder::javaobject> jsCallInvokerHolder,
        jni::alias_ref<AndroidScheduler::javaobject> scheduler,
        JavaScriptExecutorHolder* javaScriptExecutor, 
        jni::alias_ref<JavaMessageQueueThread::javaobject> messageQueueThread,
        bool isDebug,
        int runtimeType);
  static void registerNatives();
  static JavaScriptExecutorHolder* _javaScriptExecutor;
  static jni::alias_ref<JavaMessageQueueThread::javaobject> _messageQueueThread;
  static std::unique_ptr<JSExecutor> _executor;
  static std::unique_ptr<jsi::Runtime> _animatedRuntime;
  static std::unique_ptr<facebook::hermes::HermesRuntime> _animatedRuntimeHermes;
  static std::shared_ptr<jsi::Runtime> _animatedRuntimeShared;


 private:
  friend HybridBase;
  jni::global_ref<NativeProxy::javaobject> javaPart_;
  jsi::Runtime *runtime_;
  std::shared_ptr<JSExecutorFactory> factory;
  std::unique_ptr<JSExecutor> executor;
  std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker_;
  std::shared_ptr<NativeReanimatedModule> _nativeReanimatedModule;
  std::shared_ptr<Scheduler> scheduler_;
  std::shared_ptr<JMessageQueueThread> jsQueue;
  // std::shared_ptr<MessageQueueThread> jsQueue;

  void installJSIBindings();
  bool isAnyHandlerWaitingForEvent(std::string);
  void requestRender(std::function<void(double)> onRender);
  void registerEventHandler(std::function<void(std::string,std::string)> handler);
  void updateProps(jsi::Runtime &rt, int viewTag, const jsi::Object &props);
  void scrollTo(int viewTag, double x, double y, bool animated);
  std::vector<std::pair<std::string, double>> measure(int viewTag);

  explicit NativeProxy(
      jni::alias_ref<NativeProxy::jhybridobject> jThis,
      jsi::Runtime *rt,
      std::shared_ptr<facebook::react::CallInvoker> jsCallInvoker,
      std::shared_ptr<Scheduler> scheduler);
};




}
