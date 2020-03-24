#include "AndroidErrorHandler.h"
#include "Logger.h"
#include <string>

AndroidErrorHandler::AndroidErrorHandler(
    JNIEnv* env, 
    std::shared_ptr<Scheduler> scheduler, 
    std::shared_ptr<JNIRegistry> jniRegistry) {
  this->env = env;
  this->scheduler = scheduler;
  this->jniRegistry = jniRegistry;
}

void AndroidErrorHandler::raiseSpec(const char *message) {
  auto jniData = jniRegistry->getClassAndMethod(JavaMethodsUsed::RaiseException, JNIMethodMode::static_method);
  jobject messageObject = env->NewStringUTF(message);
  env->CallStaticVoidMethod(std::get<0>(jniData), std::get<1>(jniData), messageObject);
}

std::shared_ptr<Scheduler> AndroidErrorHandler::getScheduler() {
  return this->scheduler;
}
