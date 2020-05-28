#include "IOSLogger.h"
#include "Logger.h"
#import <Foundation/Foundation.h>

std::unique_ptr<LoggerInterface> Logger::instance = std::unique_ptr<IOSLogger>(new IOSLogger());

void IOSLogger::log(const char* str) {
  NSLog(@"%@", [NSString stringWithCString:str encoding:[NSString defaultCStringEncoding]]);
}

void IOSLogger::log(double d) {
  NSLog(@"%lf", d);
}

void IOSLogger::log(int i) {
   NSLog(@"%i", i);
}

void IOSLogger::log(bool b) {
  const char* str = (b)? "true" : "false";
  NSLog(@"%@", [NSString stringWithCString:str encoding:[NSString defaultCStringEncoding]]);
}
