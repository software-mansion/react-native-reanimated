#import "CppCounterProvider.h"

#import "CppCounter.h"

@implementation CppCounterProvider

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::CppCounter>(params.jsInvoker);
}

@end
