#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@interface REASnapshot : NSObject

@property (readonly) NSString* WIDTH;
@property (readonly) NSString* HEIGHT;
@property (readonly) NSString* ORIGIN_X;
@property (readonly) NSString* ORIGIN_Y;
@property (readonly) NSString* GLOBAL_ORIGIN_X;
@property (readonly) NSString* GLOBAL_ORIGIN_Y;
@property (readonly) NSString* PARENT;
@property (readonly) NSString* VIEW_MANAGER;
@property (readonly) NSString* PARENT_VIEW_MANAGER;

- (instancetype) init;
- (NSMutableDictionary<NSString*, NSObject*>*) toMap;

@end

NS_ASSUME_NONNULL_END
