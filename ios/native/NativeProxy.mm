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

RCTUIManager* uiManagerTemporary;

@implementation NativeProxy

+ (void)clear
{
  nativeReanimatedModule.reset();
  scheduler.reset();
}

+ (void)setUIManager:(RCTUIManager*)uiManager
{
  if (scheduler.get() == nullptr) {
    uiManagerTemporary = uiManager;
  } else {
    scheduler->setUIManager(uiManager);
  }
}

+ (NSArray<NSArray*>*) getChangedSharedValuesAfterRender
{
  nativeReanimatedModule->render();
  return [NativeProxy getChangedSharedValues];
}

+ (NSArray<NSArray*>*) getChangedSharedValuesAfterEvent:(NSString *)eventName event:(id<RCTEvent>)event
{
  std::string eventNameStdString([eventName UTF8String]);
  
  std::string eventAsString = folly::toJson(convertIdToFollyDynamic([event arguments][2]));
  eventAsString = "{ NativeMap:"  + eventAsString + "}";
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
  if (uiManagerTemporary != nullptr) {
    scheduler->setUIManager(uiManagerTemporary);
    uiManagerTemporary = nullptr;
  }
  
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
    NSObject *value = [self sharedValueToNSObject: (void*)(sv.get())];
    RCTAssert(value != nullptr, @"Shared value not found");
    [changed addObject:@[sharedValueId, value]];
  }

  return changed;
}

+ (NSObject*)getSharedValue: (double) id
{
    std::shared_ptr<SharedValue> sv = nativeReanimatedModule->sharedValueRegistry->getSharedValue(id);
    return [self sharedValueToNSObject: (void*)(sv.get())];
}


+ (NSObject*)sharedValueToNSObject: (void*) sv
{
    if (sv == nullptr) {
        return nullptr;
    }
    SharedValue* svptr = (SharedValue*)sv;
    NSObject *value;
    
    switch (svptr->type)
    {
        case 'D':
        {
            double dvalue = ((SharedDouble*)(svptr))->value;
            value = [NSNumber numberWithDouble:dvalue];
            break;
        }
        case 'S':
        {
            std::string str = ((SharedString*)(svptr))->value;
            value = [NSString stringWithCString:str.c_str()
            encoding:[NSString defaultCStringEncoding]];
            break;
        }
        default: {
            return nullptr;
        }
    }
    return value;
}

@end
