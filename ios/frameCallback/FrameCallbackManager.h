
@interface FrameCallbackManager : NSObject

- (instancetype)init;

- (NSNumber *)registerFrameCallback:(void (^)())callback;
- (void)unregisterFrameCallback:(NSNumber *)frameCallbackId;
- (void)manageStateFrameCallback:(NSNumber *)frameCallbackId state:(bool)state;

@end
