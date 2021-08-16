#import "REAUIManager.h"
#import <Foundation/Foundation.h>
#import "RCTComponentData.h"
#import "RCTUIManagerObserverCoordinator.h"

@interface RCTUIManager(REA)
- (void)_manageChildren:(NSNumber *)containerTag
        moveFromIndices:(NSArray<NSNumber *> *)moveFromIndices
          moveToIndices:(NSArray<NSNumber *> *)moveToIndices
      addChildReactTags:(NSArray<NSNumber *> *)addChildReactTags
           addAtIndices:(NSArray<NSNumber *> *)addAtIndices
        removeAtIndices:(NSArray<NSNumber *> *)removeAtIndices
               registry:(NSMutableDictionary<NSNumber *, id<RCTComponent>> *)registry;
@end

@implementation REAUIManager

BOOL blockSetter = false;

+ (NSString*)moduleName
{
  return NSStringFromClass([RCTUIManager class]);
}

- (void)setBridge:(RCTBridge *)bridge
{
    if(!_blockSetter) {
        _blockSetter = true;
        
        self.bridge = bridge;
        [self setValue:[bridge.uiManager valueForKey:@"_shadowViewRegistry"] forKey:@"_shadowViewRegistry"];
        [self setValue:[bridge.uiManager valueForKey:@"_viewRegistry"] forKey:@"_viewRegistry"];
        [self setValue:[bridge.uiManager valueForKey:@"_nativeIDRegistry"] forKey:@"_nativeIDRegistry"];
        [self setValue:[bridge.uiManager valueForKey:@"_shadowViewsWithUpdatedProps"] forKey:@"_shadowViewsWithUpdatedProps"];
        [self setValue:[bridge.uiManager valueForKey:@"_shadowViewsWithUpdatedChildren"] forKey:@"_shadowViewsWithUpdatedChildren"];
        [self setValue:[bridge.uiManager valueForKey:@"_pendingUIBlocks"] forKey:@"_pendingUIBlocks"];
        [self setValue:[bridge.uiManager valueForKey:@"_rootViewTags"] forKey:@"_rootViewTags"];
        [self setValue:[bridge.uiManager valueForKey:@"_observerCoordinator"] forKey:@"_observerCoordinator"];
        [self setValue:[bridge.uiManager valueForKey:@"_componentDataByName"] forKey:@"_componentDataByName"];
        
        _blockSetter = false;
    }
}

- (void)_manageChildren:(NSNumber *)containerTag
        moveFromIndices:(NSArray<NSNumber *> *)moveFromIndices
          moveToIndices:(NSArray<NSNumber *> *)moveToIndices
      addChildReactTags:(NSArray<NSNumber *> *)addChildReactTags
           addAtIndices:(NSArray<NSNumber *> *)addAtIndices
        removeAtIndices:(NSArray<NSNumber *> *)removeAtIndices
               registry:(NSMutableDictionary<NSNumber *, id<RCTComponent>> *)registry
{
//  removeDisappearing();
//  notifyAboutRemoval();
  [super _manageChildren:containerTag
         moveFromIndices:moveFromIndices
           moveToIndices:moveToIndices
       addChildReactTags:addChildReactTags
            addAtIndices:addAtIndices
         removeAtIndices:removeAtIndices
                registry:registry];
//  addDisappearing();
}

- (void)removeDisappearing:(UIView*) view
{
  
}
- (void)notifyAboutRemoval:(UIView*) view removeAtIndices:(NSArray<NSNumber *> *)removeAtIndices
{
  
}
- (void)addDisappearing:(UIView*) view
{
  
}

- (Class)class {
    return [RCTUIManager class];
}

+ (Class)class {
    return [RCTUIManager class];
}

@end
