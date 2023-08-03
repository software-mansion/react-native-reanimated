#import <RNReanimated/LayoutAnimationType.h>
#import <RNReanimated/REASnapshot.h>

#import <React/RCTUIKit.h>

@interface REASharedElement : NSObject

- (instancetype)initWithSourceView:(RCTUIView *)sourceView
                sourceViewSnapshot:(REASnapshot *)sourceViewSnapshot
                        targetView:(RCTUIView *)targetView
                targetViewSnapshot:(REASnapshot *)targetViewSnapshot;

@property RCTUIView *sourceView;
@property REASnapshot *sourceViewSnapshot;
@property RCTUIView *targetView;
@property REASnapshot *targetViewSnapshot;
@property LayoutAnimationType animationType;

@end
