#import "NativeExampleProvider.h"
#import "NativeExample.h"

@implementation NativeExampleProvider

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeExample>(params.jsInvoker);
}

@end
