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
  this->error = std::make_shared<ErrorWrapper>();
  this->error->message = std::string(message);
}

std::shared_ptr<ErrorWrapper> AndroidErrorHandler::getError() {
  return this->error;
}

void AndroidErrorHandler::handleError() {
  if (this->error != nullptr) {
    this->error->handled = true;
  }
}

std::shared_ptr<Scheduler> AndroidErrorHandler::getScheduler() {
  return this->scheduler;
}
