#include "AndroidErrorHandler.h"
#include "Logger.h"
#include <string>

AndroidErrorHandler::AndroidErrorHandler(
    std::shared_ptr<Scheduler> scheduler) {
  this->scheduler = scheduler;
}

void AndroidErrorHandler::raiseSpec(const char *message) {
  // TODO raise error for android
}

std::shared_ptr<Scheduler> AndroidErrorHandler::getScheduler() {
  return this->scheduler;
}

std::shared_ptr<ErrorWrapper> AndroidErrorHandler::getError() {
    return this->error;
}

void AndroidErrorHandler::handleError() {
    if (this->error != nullptr) {
        this->error->handled = true;
    }
}