#import <Foundation/Foundation.h>

#if __cplusplus

#import <worklets/Networking/NetworkingBackend.h>

#import <memory>

NS_ASSUME_NONNULL_BEGIN

@interface WorkletsWebSocketDelegate : NSObject <NSURLSessionWebSocketDelegate>

- (void)connect:(worklets::WebSocketConfig &&)config
       socketId:(uint64_t)socketId
       listener:(std::shared_ptr<worklets::WebSocketListener>)listener;
- (void)sendText:(uint64_t)socketId message:(std::string &&)message;
- (void)sendBinary:(uint64_t)socketId message:(std::vector<uint8_t> &&)message;
- (void)close:(uint64_t)socketId code:(uint16_t)code reason:(std::string &&)reason;
- (void)invalidate;

@end

NS_ASSUME_NONNULL_END

#endif // __cplusplus
