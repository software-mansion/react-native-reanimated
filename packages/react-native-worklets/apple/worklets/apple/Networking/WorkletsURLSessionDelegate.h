#import <Foundation/Foundation.h>

#if __cplusplus

#import <worklets/Networking/NetworkingBackend.h>

#import <memory>

@interface WorkletsURLSessionDelegate : NSObject <NSURLSessionDataDelegate>

- (void)sendRequest:(worklets::RequestConfig &&)config
          requestId:(uint64_t)requestId
           listener:(const std::shared_ptr<worklets::NetworkRequestListener> &)listener;
- (void)abortRequest:(uint64_t)requestId;
- (void)invalidate;

@end

#endif // __cplusplus
