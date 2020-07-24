#import <Foundation/Foundation.h>
#import <React/RCTLog.h>
#include "IOSErrorHandler.h"

IOSErrorHandler::IOSErrorHandler(std::shared_ptr<Scheduler> scheduler) {
    this->scheduler = scheduler;
    error = std::make_shared<ErrorWrapper>();
}

void IOSErrorHandler::raiseSpec() {
    if (error->handled) {
        return;
    }
    RCTLogError(@(error->message.c_str()));
    this->error->handled = true;
}

std::shared_ptr<Scheduler> IOSErrorHandler::getScheduler() {
    return this->scheduler;
}

std::shared_ptr<ErrorWrapper> IOSErrorHandler::getError() {
    return this->error;
}

void IOSErrorHandler::setError(std::string message) {
  if (error->handled) {
    error->message = message;
    error->handled = false;
  }
}
