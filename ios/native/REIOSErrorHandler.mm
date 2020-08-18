#include "REIOSErrorHandler.h"
#import <Foundation/Foundation.h>
#import <React/RCTLog.h>


namespace reanimated {

REIOSErrorHandler::REIOSErrorHandler(std::shared_ptr<Scheduler> scheduler) {
    this->scheduler = scheduler;
    error = std::make_shared<ErrorWrapper>();
}

void REIOSErrorHandler::raiseSpec() {
    if (error->handled) {
        return;
    }
    RCTLogError(@(error->message.c_str()));
    this->error->handled = true;
}

std::shared_ptr<Scheduler> REIOSErrorHandler::getScheduler() {
    return this->scheduler;
}

std::shared_ptr<ErrorWrapper> REIOSErrorHandler::getError() {
    return this->error;
}

void REIOSErrorHandler::setError(std::string message) {
  if (error->handled) {
    error->message = message;
    error->handled = false;
  }
}

}
