#import <DummyWorkletsModule.h>

@implementation DummyWorkletsModule{
  std::string valueUnpackerCode_;
}
RCT_EXPORT_MODULE()

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule :
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeDummyWorkletsSpecJSI>(params);
}

RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(installTurboModule)
{
  return @YES;
}

@end
