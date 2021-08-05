#import <Foundation/Foundation.h>
#import "REASnapshot.h"

NS_ASSUME_NONNULL_BEGIN

@interface REAViewHierarchyObserver

- (void) onViewRemoval: (NSObject*) view parent:(NSObject*) parent before:(REASnapshot*) before;
//- void onViewCreate(NSObject* view, NSObject* parent, Snapshot after);
//- void onViewUpdate(NSObject* view, NSObject* before, Snapshot after);

@end

NS_ASSUME_NONNULL_END
