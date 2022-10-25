@interface REASharedViewConfig : NSObject

- (instancetype)initWithTag:(NSNumber *)viewTag;

@property NSNumber *viewTag;
@property BOOL toRemove;

@end
