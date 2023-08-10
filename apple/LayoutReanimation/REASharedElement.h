#import <RNReanimated/LayoutAnimationType.h>
#import <RNReanimated/REASnapshot.h>

#import <RNReanimated/REAUIKit.h>

@interface REASharedElement : NSObject

- (instancetype)initWithSourceView:(RNAUIView *)sourceView
                sourceViewSnapshot:(REASnapshot *)sourceViewSnapshot
                        targetView:(RNAUIView *)targetView
                targetViewSnapshot:(REASnapshot *)targetViewSnapshot;

@property RNAUIView *sourceView;
@property REASnapshot *sourceViewSnapshot;
@property RNAUIView *targetView;
@property REASnapshot *targetViewSnapshot;
@property LayoutAnimationType animationType;

@end
