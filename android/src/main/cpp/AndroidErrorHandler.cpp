#include "AndroidErrorHandler.h"
#include "Logger.h"
#include <string>

AndroidErrorHandler::AndroidErrorHandler(JNIEnv* env, std::shared_ptr<Scheduler> scheduler) {
    this->env = env;
    this->scheduler = scheduler;
}

void AndroidErrorHandler::raiseSpec(const char *message) {
  /*
  std::string str = message;
  scheduler->scheduleOnUI([this, str]() mutable {
    jclass targetClass = env->FindClass("com/swmansion/reanimated/Utils");
    jmethodID targetMethod = env->GetStaticMethodID(targetClass, "raiseException", "(Ljava/lang/String;)V");
    jobject messageObject = env->NewStringUTF(str.c_str());
    env->CallStaticVoidMethod(targetClass, targetMethod, messageObject);
  });
  */
  jclass targetClass = env->FindClass("com/swmansion/reanimated/Utils");
  jmethodID targetMethod = env->GetStaticMethodID(targetClass, "raiseException", "(Ljava/lang/String;)V");
  jobject messageObject = env->NewStringUTF(message);
  env->CallStaticVoidMethod(targetClass, targetMethod, messageObject);
}

std::shared_ptr<Scheduler> AndroidErrorHandler::getScheduler() {
  return this->scheduler;
}