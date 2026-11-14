#import "RCTBenchmarkReporter.h"

#import <React/RCTSurfacePresenterStub.h>

#include <cstdio>

#import "BenchmarkSampler.h"

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

- (void)setSurfacePresenter:(id<RCTSurfacePresenterStub>)surfacePresenter
{
  [BenchmarkSampler.sharedSampler countMountsOfSurfacePresenter:surfacePresenter];
}

- (NSNumber *)markReady
{
  return @([BenchmarkSampler.sharedSampler markReadyOnJsThread]);
}

- (NSString *)currentEpochLoad
{
  return [BenchmarkSampler.sharedSampler currentEpochLoad];
}

@end
