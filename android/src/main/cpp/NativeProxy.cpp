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
#define APPNAME "NATIVE_REANIMATED"

using namespace facebook;
using namespace react;

using namespace facebook::hermes;
using namespace facebook::jsi;

std::string fun;

jsi::Value eval(jsi::Runtime &rt, const char *code) {
  return rt.global().getPropertyAsFunction(rt, "eval").call(rt, code);
}

std::unique_ptr<facebook::jsi::Runtime> r;

std::shared_ptr<Scheduler> scheduler;

std::shared_ptr<NativeReanimatedModule> nrm;

extern "C" JNIEXPORT void JNICALL
Java_com_swmansion_reanimated_NativeProxy_install(JNIEnv* env,
    jobject thiz, jlong runtimePtr) {

    auto &runtime = *(facebook::jsi::Runtime *)runtimePtr;
    r = std::unique_ptr<facebook::jsi::Runtime>(&runtime);

    JavaVM* javaVM = nullptr;
    env->GetJavaVM(&javaVM);
    std::shared_ptr<Scheduler> schedulerForModule((Scheduler*)new AndroidScheduler(javaVM));
    scheduler = schedulerForModule;

    std::shared_ptr<WorkletRegistry> workletRegistry(new WorkletRegistry());
    std::shared_ptr<SharedValueRegistry> sharedValueRegistry(new SharedValueRegistry());
    std::shared_ptr<ApplierRegistry> applierRegistry(new ApplierRegistry);

    auto module = std::make_shared<NativeReanimatedModule>(
      applierRegistry,
      sharedValueRegistry,
      workletRegistry,
      schedulerForModule,
      nullptr);
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

extern "C" JNIEXPORT jobject JNICALL
Java_com_swmansion_reanimated_NativeProxy_getChangedSharedValuesAfterRender(JNIEnv* env) {
  std::unique_ptr<jsi::Runtime> runtime2(static_cast<jsi::Runtime*>(facebook::hermes::makeHermesRuntime().release()));
  nrm->render(*runtime2);

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
    if (!sv->dirty) {
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

extern "C" JNIEXPORT jboolean JNICALL
Java_com_swmansion_reanimated_NativeProxy_anyRenderApplier(JNIEnv* env) {
  return (jboolean)nrm->applierRegistry->notEmpty();
}

extern "C" JNIEXPORT void JNICALL
Java_com_swmansion_reanimated_NativeProxy_uiCall(JNIEnv* env, jobject thiz) {
//    auto &runtime = *(facebook::jsi::Runtime *)runtimePtr;

      std::unique_ptr<jsi::Runtime> runtime2(static_cast<jsi::Runtime*>(facebook::hermes::makeHermesRuntime().release()));
     // std::string add = "5==5";
      /*std::string add = "(function(text) {return text+'ooo'})";
      std::string temp = "sdfsdfsdf";
      jsi::Object val = eval(*runtime2, add.c_str()).getObject(*runtime2);
      jsi::Function func = val.getFunction(*runtime2);
      jsi::Value stri = func.call(*runtime2, add.c_str());
      jsi::Value stri2 = func.call(*r, temp.c_str());
     // __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "Value of runtime sdgsdgsd %d", (bool)val.getBool());
      __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "result2: %s", stri.getString(*runtime2).utf8(*runtime2).c_str());
      __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "result2: %s", stri2.getString(*runtime2).utf8(*runtime2).c_str());
      __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "result3: %d", r.get() == runtime2.get());


      // test if runtimes are not equal
      jsi::String propName = jsi::String::createFromAscii(*runtime2, "NativeReanimated");
      bool one = runtime2->global().hasProperty(*runtime2, propName);
      bool two = r->global().hasProperty(*r, propName);
      __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "maaa %d %d", one, two);
      //auto s = "ooo dziala to";*/
      //__android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "git 0");

      // test get callback
    // std::string text = "odpowiedni text";
      //jsi::Object tempObj = r->global().getPropertyAsObject(*r, "callback2");
     // jsi::Function * ptr = new jsi::Function(tempObj.getFunction(*r));

      //std::unique_ptr<jsi::WeakObject> wo(new WeakObject(*r, callback));
     ///auto cb = wo->lock(*r).asObject(*r).asFunction(*r);

      __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "git 1");

      std::shared_ptr<jsi::Function> fun = nrm->workletRegistry->getWorklet(0);
      std::shared_ptr<SharedValue> sv1 = nrm->sharedValueRegistry->getSharedValue(0);
      std::shared_ptr<SharedValue> sv2 = nrm->sharedValueRegistry->getSharedValue(1);
      std::shared_ptr<SharedValue> sv3 = nrm->sharedValueRegistry->getSharedValue(2);
      fun->call(*runtime2,
        jsi::Value::undefined(),
        sv1->asParameter(*runtime2),
        sv2->asParameter(*runtime2),
        sv3->asParameter(*runtime2));
      //std::shared_ptr<jsi::Function> fun = nrm->workletRegistry->getWorklet(1);
      //jsi::Value ret1 = fun->call(*runtime2);
      double res = ((SharedDouble*)(sv3.get()))->value;



      //jsi::Value ret1 = callback.call(*r, text.c_str());
     // jsi::Value ret2 = ptr->call(*runtime2, text.c_str());
      __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "wartosc to  %f", res);
      //fun->call(*runtime2, jsi::String::createFromUtf8(*runtime2, s));
}




