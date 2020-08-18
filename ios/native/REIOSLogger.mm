#include "REIOSLogger.h"
#include "Logger.h"
#import <Foundation/Foundation.h>

namespace reanimated {

std::unique_ptr<LoggerInterface> Logger::instance = std::unique_ptr<REIOSLogger>(new REIOSLogger());

void REIOSLogger::log(const char* str) {
  NSLog(@"%@", [NSString stringWithCString:str encoding:[NSString defaultCStringEncoding]]);
}

void REIOSLogger::log(double d) {
  NSLog(@"%lf", d);
}

void REIOSLogger::log(int i) {
   NSLog(@"%i", i);
}

void REIOSLogger::log(bool b) {
  const char* str = (b)? "true" : "false";
  NSLog(@"%@", [NSString stringWithCString:str encoding:[NSString defaultCStringEncoding]]);
}

}
