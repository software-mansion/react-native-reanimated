//
//  ReanimatedAwareBridge.m
//  RNReanimated
//
//  Created by Szymon Kapala on 07/10/2020.
//

#import "REABridge.h"
#import "REACxxBridge.h"

@implementation REABridge

- (Class)bridgeClass
{
  return [REACxxBridge class];
}

- (instancetype)initWithDelegate:(id<RCTBridgeDelegate>)delegate launchOptions:(NSDictionary *)launchOptions
{
  return [super initWithDelegate:delegate bundleURL:nil moduleProvider:nil launchOptions:launchOptions];
}

- (instancetype)initWithBundleURL:(NSURL *)bundleURL
                   moduleProvider:(RCTBridgeModuleListProvider)block
                    launchOptions:(NSDictionary *)launchOptions
{
  return [super initWithDelegate:nil bundleURL:bundleURL moduleProvider:block launchOptions:launchOptions];
}

- (instancetype)initWithDelegate:(id<RCTBridgeDelegate>)delegate
                       bundleURL:(NSURL *)bundleURL
                  moduleProvider:(RCTBridgeModuleListProvider)block
                   launchOptions:(NSDictionary *)launchOptions
{
  return [super initWithDelegate:delegate bundleURL:bundleURL moduleProvider:block launchOptions:launchOptions];
}


@end
