//
//  IOSErrorHandler.m
//  Pods
//
//  Created by Karol Bisztyga on 3/16/20.
//

#import <Foundation/Foundation.h>
#import <React/RCTLog.h>
#include "IOSErrorHandler.h"

IOSErrorHandler::IOSErrorHandler(std::shared_ptr<Scheduler> scheduler) {
    this->scheduler = scheduler;
}

void IOSErrorHandler::raiseSpec(const char *message) {
    this->error = std::make_shared<ErrorWrapper>();
    this->error->message = message;
    RCTLogError(@(message));
    this->error->handled = true;
}

std::shared_ptr<Scheduler> IOSErrorHandler::getScheduler() {
    return this->scheduler;
}

std::shared_ptr<ErrorWrapper> IOSErrorHandler::getError() {
    return this->error;
}

void IOSErrorHandler::handleError() {
    if (this->error != nullptr) {
        this->error->handled = true;
    }
}
