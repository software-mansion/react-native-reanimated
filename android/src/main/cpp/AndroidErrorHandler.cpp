#include "AndroidErrorHandler.h"
#include <fbjni/fbjni.h>
#include <string>
#include "Logger.h"

namespace reanimated {

using namespace facebook::jni;

AndroidErrorHandler::AndroidErrorHandler(std::shared_ptr<Scheduler> scheduler) {
  this->scheduler = scheduler;
  this->error = std::make_shared<ErrorWrapper>();
}

void AndroidErrorHandler::raiseSpec() {
  if (error->handled) {
    return;
  }

  static const auto cls = javaClassStatic();
  static auto setMessage =
      cls->getStaticMethod<void(std::string)>("setMessage");
  setMessage(cls, this->error->message);
  static auto raise = cls->getStaticMethod<void()>("raise");
  raise(cls);

  this->error->handled = true;
}

std::shared_ptr<Scheduler> AndroidErrorHandler::getScheduler() {
  return this->scheduler;
}

std::shared_ptr<ErrorWrapper> AndroidErrorHandler::getError() {
  return this->error;
}

void AndroidErrorHandler::setError(std::string message) {
  if (error->handled) {
    error->message = message;
    error->handled = false;
  }
}

} // namespace reanimated
