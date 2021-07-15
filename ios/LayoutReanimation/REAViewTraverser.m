#import "REAViewTraverser.h"
#import "REAAnimationRootView.h"

@implementation REAViewTraverser

+ (void)traverse:(UIView*)view withBlock:(void (^)(UIView*))block shouldSkipAnimationRoots:(BOOL)shouldSkipAnimationRoots depth:(int)depth
{
    if ([view isKindOfClass:[REAAnimationRootView class]] && shouldSkipAnimationRoots) {
        return;
    }
    
    if (!depth) {
        return;
    }
    
    for (int i = 0; i < view.subviews.count; ++i) { // optimize and only go to dirty nodes
        UIView* subview = view.subviews[i];
        [REAViewTraverser traverse:subview withBlock:block shouldSkipAnimationRoots:false depth:(depth-1)];
    }
  
    block(view);
}

+ (void)traverse:(UIView*)view withBlock:(void (^)(UIView*))block
{
    if (view.superview == nil) return;
    if (![view isKindOfClass:[REAAnimationRootView class]]) {
        NSException* myException = [NSException
                exceptionWithName:@"NotAREAAnimationRootView"
                reason:@"View is not a subclass of REAAnimationRootView"
                userInfo:nil];
        @throw myException;
    }
    REAAnimationRootView* animatedRoot = (REAAnimationRootView*)view;
    
    int depth = 1e9;
    [REAViewTraverser traverse:view withBlock:block shouldSkipAnimationRoots:false depth:depth];
}

@end
