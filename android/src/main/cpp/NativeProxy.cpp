#include "NativeProxy.h"
#include <jni.h>
#include <string>
#include <android/log.h>
#include "NativeReanimatedModule.h"
#include <jsi/jsi.h>
#include <android/looper.h>
#include <unistd.h>
#include <hermes/hermes.h>
#include "AndroidScheduler.h"
#include "WorkletRegistry.h"
#include "SharedValueRegistry.h"
#include "ApplierRegistry.h"
#include "Logger.h"
#include "AndroidErrorHandler.h"
#include "SharedValue.h"
#include "JNIRegistry.h"
#include "RuntimeDecorator.h"
#define APPNAME "NATIVE_REANIMATED"

using namespace facebook;
using namespace react;

using namespace facebook::hermes;
using namespace facebook::jsi;

std::string fun;

jsi::Value eval(jsi::Runtime &rt, const char *code) {
  return rt.global().getPropertyAsFunction(rt, "eval").call(rt, code);
}

std::shared_ptr<Scheduler> scheduler;
std::shared_ptr<NativeReanimatedModule> nrm;
std::shared_ptr<JNIRegistry> jniRegistry;

extern "C" JNIEXPORT void JNICALL
Java_com_swmansion_reanimated_NativeProxy_install(JNIEnv* env,
    jobject thiz, jlong runtimePtr) {

    auto &runtime = *(facebook::jsi::Runtime *)runtimePtr;

    JavaVM* javaVM = nullptr;
    env->GetJavaVM(&javaVM);
    jniRegistry.reset(new JNIRegistry(env, javaVM));
    std::shared_ptr<Scheduler> schedulerForModule((Scheduler*)new AndroidScheduler(javaVM, jniRegistry));
    scheduler = schedulerForModule;


    std::shared_ptr<WorkletRegistry> workletRegistry(new WorkletRegistry());
    std::shared_ptr<SharedValueRegistry> sharedValueRegistry(new SharedValueRegistry());
    std::shared_ptr<MapperRegistry> mapperRegistry(new MapperRegistry(sharedValueRegistry));
    std::shared_ptr<ApplierRegistry> applierRegistry(new ApplierRegistry(mapperRegistry));
    std::shared_ptr<ErrorHandler> errorHandler((ErrorHandler*)new AndroidErrorHandler(
        env,
        schedulerForModule,
        jniRegistry));

    std::unique_ptr<jsi::Runtime> animatedRuntime(static_cast<jsi::Runtime*>(facebook::hermes::makeHermesRuntime().release()));
    RuntimeDecorator::addGlobalMethods(*animatedRuntime);

    auto module = std::make_shared<NativeReanimatedModule>(
      std::move(animatedRuntime),
      applierRegistry,
      sharedValueRegistry,
      workletRegistry,
      schedulerForModule,
      mapperRegistry,
      nullptr,
      errorHandler);
    nrm = module;
    auto object = jsi::Object::createFromHostObject(runtime, module);

    jsi::String propName = jsi::String::createFromAscii(runtime, module->name_);
    runtime.global().setProperty(runtime, propName, std::move(object));
}

extern "C" JNIEXPORT void JNICALL
Java_com_swmansion_reanimated_Scheduler_triggerUI(JNIEnv* env) {
  scheduler->triggerUI();
}


extern "C" JNIEXPORT void JNICALL
Java_com_swmansion_reanimated_Scheduler_triggerJS(JNIEnv* env) {
  scheduler->triggerJS();
}

std::string byteArrayToString(JNIEnv *env, jbyteArray byteArray) {
  size_t length = (size_t) env->GetArrayLength(byteArray);
  jboolean isCopy;
  jbyte* pBytes = env->GetByteArrayElements(byteArray, &isCopy);
  std::string ret = std::string((char *)pBytes, length);
  env->ReleaseByteArrayElements(byteArray, pBytes, JNI_ABORT);
  return ret;
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_swmansion_reanimated_NativeProxy_shouldEventBeHijacked(JNIEnv* env, jclass clazz, jbyteArray eventHash) {
  return (jboolean)nrm->applierRegistry->anyApplierRegisteredForEvent(byteArrayToString(env, eventHash));
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_swmansion_reanimated_NativeProxy_shouldRerender(JNIEnv* env) {
  bool should = nrm->applierRegistry->notEmpty();
  should = should or nrm->mapperRegistry->updatedSinceLastExecute;
  return should;
  return (jboolean)should;
}

jobject sharedValueToJObject(JNIEnv* env, std::shared_ptr<SharedValue> sv) {

  auto doubleValueOf = jniRegistry->getClassAndMethod(
    JavaMethodsUsed::DoubleValueOf,
    JNIMethodMode::static_method,
    env);
  
  jobject result = nullptr;

  if (sv == nullptr) {
    return 0;
  }

  switch (sv->type)
  {
    case SharedValueType::shared_double:
    {
      double val = ((SharedDouble*)(sv.get()))->value;
      result = env->CallStaticObjectMethod(std::get<0>(doubleValueOf), std::get<1>(doubleValueOf), val);
      break;
    }
    case SharedValueType::shared_string:
    {
      std::string str = ((SharedString*)(sv.get()))->value;
      result = env->NewStringUTF(str.c_str());
      break;
    }
    default: {}
  }
  return result;
}

jobject getChangedSharedValues(JNIEnv* env) {
  auto arrayListConstructor = jniRegistry->getClassAndMethod(
    JavaMethodsUsed::ArrayListInit,
    JNIMethodMode::standard_method,
    env);
  auto arrayListAdd = jniRegistry->getClassAndMethod(
    JavaMethodsUsed::ArrayListAdd,
    JNIMethodMode::standard_method,
    env);

  auto pairConstructor = jniRegistry->getClassAndMethod(
    JavaMethodsUsed::PairInit,
    JNIMethodMode::standard_method,
    env);

  // This is needed to go from double to Double (boxed)
  auto integerValueOf = jniRegistry->getClassAndMethod(
    JavaMethodsUsed::IntegerValueOf,
    JNIMethodMode::static_method,
    env);

  // The list we're going to return:
  jobject list = env->NewObject(std::get<0>(arrayListConstructor), std::get<1>(arrayListConstructor));

  for(auto & sharedValue : nrm->sharedValueRegistry->getSharedValueMap()) {
    int id = sharedValue.first;
    std::shared_ptr<SharedValue> sv = sharedValue.second;
    if ((!sv->dirty) || (!sv->shouldBeSentToJava)) {
      continue;
    }
    sv->dirty = false;

    jobject x = env->CallStaticObjectMethod(std::get<0>(integerValueOf), std::get<1>(integerValueOf), id);
    jobject y = sharedValueToJObject(env, sv);
    // Create a new pair object
    jobject pair = env->NewObject(std::get<0>(pairConstructor), std::get<1>(pairConstructor), x, y);
    // Add it to the list
    env->CallBooleanMethod(list, std::get<1>(arrayListAdd), pair);
  }

  return list;
}

extern "C" JNIEXPORT jobject JNICALL
Java_com_swmansion_reanimated_NativeProxy_getChangedSharedValuesAfterRender(JNIEnv* env) {
  nrm->render();
  return getChangedSharedValues(env);
}

extern "C" JNIEXPORT jobject JNICALL
Java_com_swmansion_reanimated_NativeProxy_getSharedValue(JNIEnv* env, jclass clazz, int id) {
  std::shared_ptr<SharedValue> sv = nrm->sharedValueRegistry->getSharedValue(id);

  return sharedValueToJObject(env, sv);
}

extern "C" JNIEXPORT jobject JNICALL
Java_com_swmansion_reanimated_NativeProxy_getChangedSharedValuesAfterEvent(JNIEnv* env, jclass clazz, jbyteArray eventHash, jbyteArray eventObj) {
  std::string eventAsString = byteArrayToString(env, eventObj);
  __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "event: %s", eventAsString.c_str());
  nrm->onEvent(byteArrayToString(env, eventHash), eventAsString);

  return getChangedSharedValues(env);
}

extern "C" JNIEXPORT void JNICALL
Java_com_swmansion_reanimated_NativeProxy_clear(JNIEnv* env) {
  nrm.reset();
  scheduler.reset();
}

// tests (temporary)

jsi::Function function(jsi::Runtime &rt, const std::string& code) {
  return eval(rt, ("(" + code + ")").c_str()).getObject(rt).getFunction(rt);
}


extern "C" JNIEXPORT void
Java_com_swmansion_reanimated_NativeProxy_uiCall(JNIEnv* env, jclass clazz) {
  std::unique_ptr<jsi::Runtime> rt(static_cast<jsi::Runtime*>(facebook::hermes::makeHermesRuntime().release()));

   jsi::Function checkPropertyFunction =
          function(*rt, "function() { return this.event === 'a_property' }");
    class APropertyHostObject : public jsi::HostObject {
        jsi::Value get(jsi::Runtime& rt, const jsi::PropNameID& sym) override {
          return jsi::String::createFromUtf8(rt, "a_property");
        }

        void set(jsi::Runtime&, const jsi::PropNameID&, const jsi::Value&) override {}
      };
      jsi::Object hostObject =
          Object::createFromHostObject(*rt, std::make_shared<APropertyHostObject>());
      bool val  = checkPropertyFunction.callWithThis(*rt, hostObject).getBool();
      __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "boolean : %d", (int)val);
}




