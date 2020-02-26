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
#include "ListenerRegistry.h"
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

extern "C" JNIEXPORT void JNICALL
Java_com_swmansion_reanimated_NativeProxy_install(JNIEnv* env,
    jobject thiz, jlong runtimePtr) {

    auto &runtime = *(facebook::jsi::Runtime *)runtimePtr;

    JavaVM* javaVM = nullptr;
    env->GetJavaVM(&javaVM);
    std::shared_ptr<Scheduler> schedulerForModule((Scheduler*)new AndroidScheduler(javaVM));
    scheduler = schedulerForModule;

    std::shared_ptr<WorkletRegistry> workletRegistry(new WorkletRegistry());
    std::shared_ptr<SharedValueRegistry> sharedValueRegistry(new SharedValueRegistry());
    std::shared_ptr<ApplierRegistry> applierRegistry(new ApplierRegistry);
    std::shared_ptr<ListenerRegistry> listenerRegistry(new ListenerRegistry);

    std::unique_ptr<jsi::Runtime> animatedRuntime(static_cast<jsi::Runtime*>(facebook::hermes::makeHermesRuntime().release()));

    auto module = std::make_shared<NativeReanimatedModule>(
      std::move(animatedRuntime),
      applierRegistry,
      sharedValueRegistry,
      workletRegistry,
      schedulerForModule,
      nullptr,
      listenerRegistry);
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
Java_com_swmansion_reanimated_NativeProxy_anyRenderApplier(JNIEnv* env) {
  return (jboolean)nrm->applierRegistry->notEmpty();
}

jobject getChangedSharedValues(JNIEnv* env) {
  jclass arrayListClass = env->FindClass("java/util/ArrayList");
  jmethodID arrayListConstructor = env->GetMethodID(arrayListClass, "<init>", "()V");
  jmethodID addMethod = env->GetMethodID(arrayListClass, "add", "(Ljava/lang/Object;)Z");

  jclass pairClass = env->FindClass("android/util/Pair");
  jmethodID pairConstructor = env->GetMethodID(pairClass, "<init>", "(Ljava/lang/Object;Ljava/lang/Object;)V");

  // This is needed to go from double to Double (boxed)
  jclass doubleClass = env->FindClass("java/lang/Double");
  jmethodID doubleValueOf = env->GetStaticMethodID(doubleClass, "valueOf", "(D)Ljava/lang/Double;");

  // This is needed to go from double to Double (boxed)
  jclass integerClass = env->FindClass("java/lang/Integer");
  jmethodID integerValueOf = env->GetStaticMethodID(integerClass, "valueOf", "(I)Ljava/lang/Integer;");

  // The list we're going to return:
  jobject list = env->NewObject(arrayListClass, arrayListConstructor);

  for(auto & sharedValue : nrm->sharedValueRegistry->sharedValueMap) {
    int id = sharedValue.first;
    std::shared_ptr<SharedValue> sv = sharedValue.second;
    if ((!sv->dirty) || (!sv->shouldBeSentToJava)) {
      continue;
    }
    sv->dirty = false;

    jobject x = env->CallStaticObjectMethod(integerClass, integerValueOf, id);
    jobject y;

    // temporary solution
    switch (sv->type)
    {
      case 'D':
      {
        double val = ((SharedDouble*)(sv.get()))->value;
        y = env->CallStaticObjectMethod(doubleClass, doubleValueOf, val);
        break;
      }
      case 'S':
      {
        std::string str = ((SharedString*)(sv.get()))->value;
        y = env->NewStringUTF(str.c_str());
        break;
      }
    }
    // end

    // Create a new pair object
    jobject pair = env->NewObject(pairClass, pairConstructor, x, y);
    // Add it to the list
    env->CallBooleanMethod(list, addMethod, pair);
  }

  return list;
}

extern "C" JNIEXPORT jobject JNICALL
Java_com_swmansion_reanimated_NativeProxy_getChangedSharedValuesAfterRender(JNIEnv* env) {
  nrm->render();
  return getChangedSharedValues(env);
}

extern "C" JNIEXPORT jobject JNICALL
Java_com_swmansion_reanimated_NativeProxy_getChangedSharedValuesAfterEvent(JNIEnv* env, jclass clazz, jbyteArray eventHash, jbyteArray eventObj) {
  std::string eventAsString = byteArrayToString(env, eventObj);
  __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "event: %s", eventAsString.c_str());
  nrm->onEvent(byteArrayToString(env, eventHash), eventAsString);

  return getChangedSharedValues(env);
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




