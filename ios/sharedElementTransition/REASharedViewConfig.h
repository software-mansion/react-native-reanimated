@interface REASharedViewConfig : NSObject

- (instancetype)initWithTag:(NSNumber *)viewTag;
- (void)setView:(UIView *)view;
- (UIView *)getView;

@property NSNumber *viewTag;
@property BOOL toRemove;

@end
