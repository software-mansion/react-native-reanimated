#import "RCTBenchmarkReporter.h"

#include <pthread.h>
#include <cstdio>

@implementation RCTBenchmarkReporter

+ (NSString *)moduleName
{
  return @"BenchmarkReporter";
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeBenchmarkReporterSpecJSI>(params);
}

- (void)report:(NSString *)line
{
  std::printf("ReanimatedBenchmark: %s\n", line.UTF8String);
  std::fflush(stdout);
}

- (NSNumber *)currentThreadId
{
  uint64_t threadId = 0;
  pthread_threadid_np(nullptr, &threadId);
  return @(threadId);
}

@end
