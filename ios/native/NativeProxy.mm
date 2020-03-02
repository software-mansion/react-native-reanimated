//
//  NativeProxy.m
//  DoubleConversion
//
//  Created by Szymon Kapala on 27/02/2020.
//

#import "NativeProxy.h"
#include <folly/json.h>
#import <React/RCTFollyConvert.h>
#import "IOSScheduler.h"
#import <jsi/JSCRuntime.h>

@interface NativeProxy()

@end

std::shared_ptr<NativeReanimatedModule> nativeReanimatedModule;
std::shared_ptr<IOSScheduler> scheduler;

@implementation NativeProxy

+ (void)clear
{
  nativeReanimatedModule.reset();
  scheduler.reset();
}

+ (void)setUIManager:(RCTUIManager*)uiManager
{
  scheduler->setUIManager(uiManager);
}

+ (NSArray<NSArray*>*) getChangedSharedValuesAfterRender
{
  nativeReanimatedModule->render();
  return [NativeProxy getChangedSharedValues];
}

+ (NSArray<NSArray*>*) getChangedSharedValuesAfterEvent:(NSString *)eventName event:(id<RCTEvent>)event
{
  std::string eventNameStdString([eventName UTF8String]);
  
  std::string eventAsString = folly::toJson(convertIdToFollyDynamic(event));
  eventAsString = "{ NativeMap:"  + eventAsString + "} }";
  nativeReanimatedModule->onEvent(eventNameStdString, eventAsString);
  return  [NativeProxy getChangedSharedValues];
}

+ (BOOL)shouldEventBeHijacked:(NSString*)eventName
{
  std::string eventNameStdString([eventName UTF8String]);
  return nativeReanimatedModule->applierRegistry->anyApplierRegisteredForEvent(eventNameStdString);
}

+ (BOOL)anyRenderApplier
{
  return nativeReanimatedModule->applierRegistry->notEmpty();
}

+ (void*) getNativeReanimatedModule:(void*)jsInvokerVoidPtr
{
  std::shared_ptr<JSCallInvoker> jsInvoker = *(static_cast<std::shared_ptr<JSCallInvoker>*>(jsInvokerVoidPtr));
  scheduler = std::make_shared<IOSScheduler>(jsInvoker);
  
  std::shared_ptr<Scheduler> schedulerForModule((Scheduler*)scheduler.get());
  std::shared_ptr<WorkletRegistry> workletRegistry(new WorkletRegistry());
  std::shared_ptr<SharedValueRegistry> sharedValueRegistry(new SharedValueRegistry());
  std::shared_ptr<ApplierRegistry> applierRegistry(new ApplierRegistry());
  std::unique_ptr<jsi::Runtime> animatedRuntime(static_cast<jsi::Runtime*>(facebook::jsc::makeJSCRuntime().release()));
  
  nativeReanimatedModule = std::make_shared<NativeReanimatedModule>(std::move(animatedRuntime),
  applierRegistry,
  sharedValueRegistry,
  workletRegistry,
  schedulerForModule,
  jsInvoker);
  
  return (void*)(&nativeReanimatedModule);
}

+ (NSArray<NSArray*>*)getChangedSharedValues
{
  NSMutableArray *changed = [NSMutableArray new];
  for(auto & sharedValue : nativeReanimatedModule->sharedValueRegistry->sharedValueMap) {
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
        value = [NSNumber numberWithDouble:val];
        break;
      }
      case 'S':
      {
        std::string str = ((SharedString*)(sv.get()))->value;
        value = [NSString stringWithCString:str.c_str()
        encoding:[NSString defaultCStringEncoding]];
        break;
      }
    }
    [changed addObject:@[sharedValueId, value]];
  }

  return changed;
}

@end

