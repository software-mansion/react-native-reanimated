//
//  NativeProxy.m
//  DoubleConversion
//
//  Created by Szymon Kapala on 27/02/2020.
//

#import "NativeProxy.h"
#import <folly/json.h>
#import <React/RCTFollyConvert.h>

@interface NativeProxy()

@end

@implementation NativeProxy

+ (void)clear()
{
  self.nativeReanimatedModule.reset();
  self.scheduler.reset();
}

+ (void)setUIManager:(RCTUIManager*)uiManager
{
  self.scheduler->setUIManager(uiManager);
}

+ (NSArray<NSArray*>*) getChangedSharedValuesAfterRender
{
  self.nativeReanimatedModule->render();
  return getChangedSharedValues();
}

+ (NSArray<NSArray*>*) getChangedSharedValuesAfterEvent:(NSString *)eventName event:(id<RCTEvent>)event
{
  std::string eventNameStdString([eventName UTF8String]);
  
  std::string eventAsString = folly::toJson(convertIdToFollyDynamic(event));
  eventAsString = "{ NativeMap:"  + eventAsString + "} }";
  
  std::string eventObjStdString([event UTF8String]);
  self.NativeReanimatedModule.onEvent(eventName, eventAsString);
  return getChangedSharedValues();
}

+ (BOOL)shouldEventBeHijacked:(NSString*)eventName
{
  std::string eventNameStdString([eventName UTF8String]);
  return self.nativeReanimatedModule->shouldEventBeHijacked(eventNameStdString);
}

+ (BOOL)anyRenderApplier
{
  return self.nativeReanimatedModule->anyRenderApplier();
}

+ (std::shared_ptr<NativeReanimatedModule>) getNativeReanimatedModule: jsInvoker: (std::shared_ptr<JSCallInvoker>)jsInvoker
{
  self.scheduler = std::make_shared<IOSScheduler>(jsInvoker);
  
  std::shared_ptr<Scheduler> schedulerForModule((Scheduler*)self.scheduler.get());
  std::shared_ptr<WorkletRegistry> workletRegistry(new WorkletRegistry());
  std::shared_ptr<SharedValueRegistry> sharedValueRegistry(new SharedValueRegistry());
  std::shared_ptr<ApplierRegistry> applierRegistry(new ApplierRegistry());
  std::unique_ptr<jsi::Runtime> animatedRuntime(static_cast<jsi::Runtime*>(facebook::jsc::makeJSCRuntime().release()));
  return std::make_shared<NativeReanimatedModule>(std::move(animatedRuntime),
                                                  applierRegistry,
                                                  sharedValueRegistry,
                                                  workletRegistry,
                                                  schedulerForModule,
                                                  jsInvoker);
}

+ (NSArray<NSArray*>*)getChangedSharedValues()
{
  NSMutableArray *changed = [NSMutableArray new];
  for(auto & sharedValue : nrm->sharedValueRegistry->sharedValueMap) {
    int svId = sharedValue.first;
    std::shared_ptr<SharedValue> sv = sharedValue.second;
    if ((!sv->dirty) || (!sv->shouldBeSentToJava)) {
      continue;
    }
    sv->dirty = false;

    NSNumber *sharedValueId = [NSNumber numberWithInteger: svId];
    NSObject *value;

    // temporary solution
    switch (sv->type)
    {
      case 'D':
      {
        double val = ((SharedDouble*)(sv.get()))->value;
        y = [NSNumber numberWithDouble:val];
        break;
      }
      case 'S':
      {
        std::string str = ((SharedString*)(sv.get()))->value;
        y = [NSString stringWithCString:str.c_str()
        encoding:[NSString defaultCStringEncoding]];
        break;
      }
    }
    [changed addObject:@[sharedValueId, value]];
  }

  return changed;
}

@end

