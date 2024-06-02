/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTSampleTurboModule.h"

#import <React/RCTAssert.h>
#import <React/RCTUtils.h>

using namespace facebook::react;

@implementation RCTSampleTurboModule

// Backward-compatible export
RCT_EXPORT_MODULE()

// Backward-compatible queue configuration
+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (dispatch_queue_t)methodQueue
{
  return dispatch_get_main_queue();
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<NativeSampleTurboModuleSpecJSI>(params);
}

// Backward compatible invalidation
- (void)invalidate
{
  // Actually do nothing here.
  NSLog(@"Invalidating RCTSampleTurboModule...");
}

- (NSDictionary *)getConstants
{
  __block NSDictionary *constants;
  RCTUnsafeExecuteOnMainQueueSync(^{
#if !TARGET_OS_OSX // [macOS]
#if !TARGET_OS_VISION // [visionOS]
    UIScreen *mainScreen = UIScreen.mainScreen;
    CGSize screenSize = mainScreen.bounds.size;
#else // [visionOS
	CGSize screenSize = CGSizeZero;
#endif // visionOS]
#else // [macOS
    NSScreen *mainScreen = NSScreen.mainScreen;
    CGSize screenSize = mainScreen.frame.size;
#endif // macOS]

    constants = @{
      @"const1" : @YES,
      @"const2" : @(screenSize.width),
      @"const3" : @"something",
    };
  });

  return constants;
}

// TODO: Remove once fully migrated to TurboModule.
- (NSDictionary *)constantsToExport
{
  return [self getConstants];
}

RCT_EXPORT_METHOD(voidFunc)
{
  // Nothing to do
}

RCT_EXPORT_SYNCHRONOUS_TYPED_METHOD(NSNumber *, getBool : (BOOL)arg)
{
  return @(arg);
}

RCT_EXPORT_SYNCHRONOUS_TYPED_METHOD(NSNumber *, getEnum : (double)arg)
{
  return @(arg);
}

RCT_EXPORT_SYNCHRONOUS_TYPED_METHOD(NSNumber *, getNumber : (double)arg)
{
  return @(arg);
}

RCT_EXPORT_SYNCHRONOUS_TYPED_METHOD(NSString *, getString : (NSString *)arg)
{
  return arg;
}

RCT_EXPORT_SYNCHRONOUS_TYPED_METHOD(NSArray<id<NSObject>> *, getArray : (NSArray *)arg)
{
  return arg;
}

RCT_EXPORT_SYNCHRONOUS_TYPED_METHOD(NSDictionary *, getObject : (NSDictionary *)arg)
{
  return arg;
}

RCT_EXPORT_SYNCHRONOUS_TYPED_METHOD(NSDictionary *, getUnsafeObject : (NSDictionary *)arg)
{
  return arg;
}

RCT_EXPORT_SYNCHRONOUS_TYPED_METHOD(NSNumber *, getRootTag : (double)arg)
{
  return @(arg);
}

RCT_EXPORT_SYNCHRONOUS_TYPED_METHOD(NSDictionary *, getValue : (double)x y : (NSString *)y z : (NSDictionary *)z)
{
  return @{
    @"x" : @(x),
    @"y" : y ?: [NSNull null],
    @"z" : z ?: [NSNull null],
  };
}

RCT_EXPORT_METHOD(getValueWithCallback : (RCTResponseSenderBlock)callback)
{
  if (!callback) {
    return;
  }
  callback(@[ @"value from callback!" ]);
}

RCT_EXPORT_METHOD(getValueWithPromise
                  : (BOOL)error resolve
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject)
{
  if (!resolve || !reject) {
    return;
  }

  if (error) {
    reject(
        @"code_1",
        @"intentional promise rejection",
        [NSError errorWithDomain:@"RCTSampleTurboModule" code:1 userInfo:nil]);
  } else {
    resolve(@"result!");
  }
}

RCT_EXPORT_METHOD(voidFuncThrows)
{
  NSException *myException = [NSException exceptionWithName:@"Excepption"
                                                     reason:@"Intentional exception from ObjC voidFuncThrows"
                                                   userInfo:nil];
  @throw myException;
}

RCT_EXPORT_SYNCHRONOUS_TYPED_METHOD(NSDictionary *, getObjectThrows : (NSDictionary *)arg)
{
  NSException *myException = [NSException exceptionWithName:@"Excepption"
                                                     reason:@"Intentional exception from ObjC getObjectThrows"
                                                   userInfo:nil];
  @throw myException;
}

RCT_EXPORT_METHOD(promiseThrows
                  : (BOOL)error resolve
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject)
{
  NSException *myException = [NSException exceptionWithName:@"Excepption"
                                                     reason:@"Intentional exception from ObjC promiseThrows"
                                                   userInfo:nil];
  @throw myException;
}

RCT_EXPORT_METHOD(voidFuncAssert)
{
  RCTAssert(false, @"Intentional assert from ObjC voidFuncAssert");
}

RCT_EXPORT_SYNCHRONOUS_TYPED_METHOD(NSDictionary *, getObjectAssert : (NSDictionary *)arg)
{
  RCTAssert(false, @"Intentional assert from ObjC getObjectAssert");
  return arg;
}

RCT_EXPORT_METHOD(promiseAssert
                  : (BOOL)error resolve
                  : (RCTPromiseResolveBlock)resolve reject
                  : (RCTPromiseRejectBlock)reject)
{
  RCTAssert(false, @"Intentional assert from ObjC promiseAssert");
}

@end
