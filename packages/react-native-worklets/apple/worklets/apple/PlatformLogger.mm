#import <Foundation/Foundation.h>
#import <worklets/Tools/PlatformLogger.h>

namespace worklets {

void PlatformLogger::log(const char *str)
{
  NSLog(@"%@", [NSString stringWithCString:str encoding:[NSString defaultCStringEncoding]]);
}

void PlatformLogger::log(const std::string &str)
{
  log(str.c_str());
}

void PlatformLogger::log(const double d)
{
  NSLog(@"%lf", d);
}

void PlatformLogger::log(const int i)
{
  NSLog(@"%i", i);
}

void PlatformLogger::log(const bool b)
{
  log(b ? "true" : "false");
}

} // namespace worklets
