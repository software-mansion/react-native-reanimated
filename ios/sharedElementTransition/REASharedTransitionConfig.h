@interface REASharedTransitionConfig : NSObject

@property UIView *fromView;
@property UIView *toView;
@property UIView *fromContainer;
@property int fromViewIndex;
@property CGRect fromViewFrame;

- (instancetype)initWithFromView:(UIView *)fromView
                          toView:(UIView *)toView
                   fromContainer:(UIView *)fromContainer
                   fromViewFrame:(CGRect)fromViewFrame;

@end
