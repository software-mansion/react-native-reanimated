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
  this->error.message = std::string(message);
}

ErrorWrapper AndroidErrorHandler::getError() {
  return this->error;
}

void AndroidErrorHandler::handleError() {
  this->error.handled = true;
  this->error.message="";
}

std::shared_ptr<Scheduler> AndroidErrorHandler::getScheduler() {
  return this->scheduler;
}
