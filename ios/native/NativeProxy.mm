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
#import "IOSErrorHandler.h"
#import <jsi/JSCRuntime.h>
#import "RuntimeDecorator.h"

@interface NativeProxy()

@end

std::shared_ptr<NativeReanimatedModule> nativeReanimatedModule;
std::shared_ptr<IOSScheduler> scheduler;

@implementation NativeProxy

+ (void)clear
{
  scheduler.reset();
  nativeReanimatedModule.reset();
}

+ (NSArray<NSArray*>*) getChangedSharedValuesAfterRender
{
  try {
    nativeReanimatedModule->render();
  } catch(const std::exception &e) {
    if (nativeReanimatedModule->errorHandler->getError() == nullptr) {
      std::string message = "error occured: ";
      message += e.what();
      nativeReanimatedModule->errorHandler->raise(message.c_str());
    }
  }
  return [NativeProxy getChangedSharedValues];
}

+ (NSArray<NSArray*>*) getChangedSharedValuesAfterEvent:(NSString *)eventName event:(id<RCTEvent>)event
{
  std::string eventNameStdString([eventName UTF8String]);
  
  std::string eventAsString = folly::toJson(convertIdToFollyDynamic([event arguments][2]));
  eventAsString = "{ NativeMap:"  + eventAsString + "}";
  try {
    nativeReanimatedModule->onEvent(eventNameStdString, eventAsString);
  } catch(const std::exception &e) {
    if (nativeReanimatedModule->errorHandler->getError() == nullptr) {
      std::string message = "error occured: ";
      message += e.what();
      nativeReanimatedModule->errorHandler->raise(message.c_str());
    }
  }
  return  [NativeProxy getChangedSharedValues];
}

+ (BOOL)shouldEventBeHijacked:(NSString*)eventName
{
  std::string eventNameStdString([eventName UTF8String]);
  return nativeReanimatedModule->applierRegistry->anyApplierRegisteredForEvent(eventNameStdString);
}

+ (BOOL)shouldRerender
{
  bool should = nativeReanimatedModule->applierRegistry->notEmpty();
  should = should or nativeReanimatedModule->mapperRegistry->updatedSinceLastExecute;
  return should;
}

+ (void*) getNativeReanimatedModule:(void*)jsInvokerVoidPtr
{
  std::shared_ptr<JSCallInvoker> jsInvoker = *(static_cast<std::shared_ptr<JSCallInvoker>*>(jsInvokerVoidPtr));
  
  scheduler = std::make_shared<IOSScheduler>(jsInvoker);
  
  std::shared_ptr<Scheduler> schedulerForModule(scheduler);
  std::shared_ptr<ErrorHandler> errorHandler((ErrorHandler*)new IOSErrorHandler(schedulerForModule));
  std::shared_ptr<WorkletRegistry> workletRegistry(new WorkletRegistry());
  std::shared_ptr<SharedValueRegistry> sharedValueRegistry(new SharedValueRegistry());
  std::shared_ptr<MapperRegistry> mapperRegistry(new MapperRegistry(sharedValueRegistry));
  std::shared_ptr<ApplierRegistry> applierRegistry(new ApplierRegistry(mapperRegistry, errorHandler));
  std::unique_ptr<jsi::Runtime> animatedRuntime(static_cast<jsi::Runtime*>(facebook::jsc::makeJSCRuntime().release()));
  RuntimeDecorator::addGlobalMethods(*animatedRuntime);
  
  nativeReanimatedModule = std::make_shared<NativeReanimatedModule>(std::move(animatedRuntime),
  applierRegistry,
  sharedValueRegistry,
  workletRegistry,
  schedulerForModule,
  mapperRegistry,
  jsInvoker,
  errorHandler);
  
  return (void*)(&nativeReanimatedModule);
}

+ (NSArray<NSArray*>*)getChangedSharedValues
{
  NSMutableArray *changed = [NSMutableArray new];
  for(auto & sharedValue : nativeReanimatedModule->sharedValueRegistry->getSharedValueMap()) {
    int svId = sharedValue.first;
    std::shared_ptr<SharedValue> sv = sharedValue.second;
    if ((!sv->dirty) || (!sv->shouldBeSentToJava)) {
      continue;
    }
    sv->dirty = false;

    NSNumber *sharedValueId = [NSNumber numberWithInteger: svId];
    NSObject *value = [self sharedValueToNSObject: (void*)(sv.get())];
    if (value == nullptr) {
      RCTLogError(@"Shared value not found");
    }
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
        case SharedValueType::shared_double:
        {
            double dvalue = ((SharedDouble*)(svptr))->value;
            value = [NSNumber numberWithDouble:dvalue];
            break;
        }
        case SharedValueType::shared_string:
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
