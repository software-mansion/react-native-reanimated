//
//  REACxxBridge.m
//  RNReanimated
//
//  Created by Szymon Kapala on 07/10/2020.
//

#import "REACxxBridge.h"
#import "NativeProxy.h"

@implementation REACxxBridge {
  id<RCTTurboModuleLookupDelegate> _turboModuleLookupDelegate;
}

- (instancetype)initWithParentBridge:(RCTBridge *)bridge
{
  self = [super initWithParentBridge:bridge];
  if (self) {
    
  }
  return self;
}

- (void)setRCTTurboModuleLookupDelegate:(id<RCTTurboModuleLookupDelegate>)turboModuleLookupDelegate {
  _turboModuleLookupDelegate = turboModuleLookupDelegate;
  [super setRCTTurboModuleLookupDelegate:turboModuleLookupDelegate];
}

- (id)moduleForName:(NSString *)moduleName lazilyLoadIfNecessary:(BOOL)lazilyLoad
{
  if ([moduleName  isEqual: @"NativeReanimated"]) {
    const char *moduleNameCStr = [moduleName UTF8String];
    if (lazilyLoad || [_turboModuleLookupDelegate moduleIsInitialized:moduleNameCStr]) {
      id<RCTTurboModule> module = [_turboModuleLookupDelegate moduleForName:moduleNameCStr warnOnLookupFailure:NO];
      if (module != nil) {
        return module;
      }
    }
  }
  return [super moduleForName:moduleName lazilyLoadIfNecessary:lazilyLoad];
}

@end
