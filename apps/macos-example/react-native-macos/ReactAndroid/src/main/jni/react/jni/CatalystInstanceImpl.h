/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include <memory>
#include <string>

#include <ReactCommon/CallInvokerHolder.h>
#include <ReactCommon/NativeMethodCallInvokerHolder.h>
#include <ReactCommon/RuntimeExecutor.h>
#include <fbjni/fbjni.h>

#include "CxxModuleWrapper.h"
#include "JMessageQueueThread.h"
#include "JRuntimeExecutor.h"
#include "JRuntimeScheduler.h"
#include "JSLoader.h"
#include "JavaModuleWrapper.h"
#include "ModuleRegistryBuilder.h"

namespace facebook::react {

class Instance;
class JavaScriptExecutorHolder;
class NativeArray;

struct ReactCallback : public jni::JavaClass<ReactCallback> {
  static constexpr auto kJavaDescriptor =
      "Lcom/facebook/react/bridge/ReactCallback;";
};

class CatalystInstanceImpl : public jni::HybridClass<CatalystInstanceImpl> {
 public:
  static constexpr auto kJavaDescriptor =
      "Lcom/facebook/react/bridge/CatalystInstanceImpl;";

  static jni::local_ref<jhybriddata> initHybrid(jni::alias_ref<jclass>);

  static void registerNatives();

  std::shared_ptr<Instance> getInstance() {
    return instance_;
  }

 private:
  friend HybridBase;

  CatalystInstanceImpl();

  void initializeBridge(
      jni::alias_ref<ReactCallback::javaobject> callback,
      // This executor is actually a factory holder.
      JavaScriptExecutorHolder* jseh,
      jni::alias_ref<JavaMessageQueueThread::javaobject> jsQueue,
      jni::alias_ref<JavaMessageQueueThread::javaobject> moduleQueue,
      jni::alias_ref<
          jni::JCollection<JavaModuleWrapper::javaobject>::javaobject>
          javaModules,
      jni::alias_ref<jni::JCollection<ModuleHolder::javaobject>::javaobject>
          cxxModules);

  void extendNativeModules(
      jni::alias_ref<jni::JCollection<
          JavaModuleWrapper::javaobject>::javaobject> javaModules,
      jni::alias_ref<jni::JCollection<ModuleHolder::javaobject>::javaobject>
          cxxModules);

  /**
   * Sets the source URL of the underlying bridge without loading any JS code.
   */
  void jniSetSourceURL(const std::string& sourceURL);

  /**
   * Registers the file path of an additional JS segment by its ID.
   *
   */
  void jniRegisterSegment(int segmentId, const std::string& path);

  void jniLoadScriptFromAssets(
      jni::alias_ref<JAssetManager::javaobject> assetManager,
      const std::string& assetURL,
      bool loadSynchronously);
  void jniLoadScriptFromFile(
      const std::string& fileName,
      const std::string& sourceURL,
      bool loadSynchronously);
  void jniCallJSFunction(
      std::string module,
      std::string method,
      NativeArray* arguments);
  void jniCallJSCallback(jint callbackId, NativeArray* arguments);
  jni::alias_ref<CallInvokerHolder::javaobject> getJSCallInvokerHolder();
  jni::alias_ref<NativeMethodCallInvokerHolder::javaobject>
  getNativeMethodCallInvokerHolder();
  jni::alias_ref<JRuntimeExecutor::javaobject> getRuntimeExecutor();
  jni::alias_ref<JRuntimeScheduler::javaobject> getRuntimeScheduler();
  void setGlobalVariable(std::string propName, std::string&& jsonValue);
  jlong getJavaScriptContext();
  void handleMemoryPressure(int pressureLevel);

  void createAndInstallRuntimeSchedulerIfNecessary();

  // This should be the only long-lived strong reference, but every C++ class
  // will have a weak reference.
  std::shared_ptr<Instance> instance_;
  std::shared_ptr<ModuleRegistry> moduleRegistry_;
  std::shared_ptr<JMessageQueueThread> moduleMessageQueue_;
  jni::global_ref<CallInvokerHolder::javaobject> jsCallInvokerHolder_;
  jni::global_ref<NativeMethodCallInvokerHolder::javaobject>
      nativeMethodCallInvokerHolder_;
  jni::global_ref<JRuntimeExecutor::javaobject> runtimeExecutor_;
  jni::global_ref<JRuntimeScheduler::javaobject> runtimeScheduler_;
};

} // namespace facebook::react
