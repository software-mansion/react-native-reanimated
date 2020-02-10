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

extern "C" JNIEXPORT void JNICALL
Java_com_swmansion_reanimated_NativeProxy_install(JNIEnv* env,
    jobject thiz, jlong runtimePtr) {

    auto &runtime = *(facebook::jsi::Runtime *)runtimePtr;
    r = std::unique_ptr<facebook::jsi::Runtime>(&runtime);

    JavaVM* javaVM = nullptr;
    env->GetJavaVM(&javaVM);
    std::shared_ptr<Scheduler> schedulerForModule((Scheduler*)new AndroidScheduler(javaVM));
    scheduler = schedulerForModule;

    auto module = std::make_shared<NativeReanimatedModule>(schedulerForModule, nullptr);
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


/*extern "C" JNIEXPORT void JNICALL
Java_com_swmansion_reanimated_NativeProxy_uiCall(JNIEnv* env, jobject thiz) {
//    auto &runtime = *(facebook::jsi::Runtime *)runtimePtr;

      std::unique_ptr<jsi::Runtime> runtime2(static_cast<jsi::Runtime*>(facebook::hermes::makeHermesRuntime().release()));
     // std::string add = "5==5";
      std::string add = "(function(text) {return text+'ooo'})";
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
      //auto s = "ooo dziala to";


      // test get callback
      std::string text = "odpowiedni text";
      jsi::Object tempObj = r->global().getPropertyAsObject(*r, "callback2");
      jsi::Function callback = tempObj.getFunction(*r);
      jsi::Value ret1 = callback.call(*r, text.c_str());
      jsi::Value ret2 = callback.call(*runtime2, text.c_str());
      __android_log_print(ANDROID_LOG_VERBOSE, APPNAME, "wartosci to  %d %d", (int)ret1.asNumber(), (int)ret2.asNumber());
      //fun->call(*runtime2, jsi::String::createFromUtf8(*runtime2, s));
}*/




