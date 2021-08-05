#import "REASnapshot.h"
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

@implementation REASnapshot

static NSString* WIDTH = @"width";
static NSString* HEIGHT = @"height";
static NSString* ORIGIN_X = @"originX";
static NSString* ORIGIN_Y = @"originY";
static NSString* GLOBAL_ORIGIN_X = @"globalOriginX";
static NSString* GLOBAL_ORIGIN_Y = @"globalOriginY";
static NSString* PARENT = @"parent";
static NSString* VIEW_MANAGER = @"viewManager";
static NSString* PARENT_VIEW_MANAGER = @"parentViewManager";

- (instancetype) init { // TODO
    self = [super init];
    return self;
}

- (NSMutableDictionary<NSString*, NSObject*>*) toMap { // TODO
    NSMutableDictionary* values = [NSMutableDictionary new];
    return values;
}

@end

NS_ASSUME_NONNULL_END
