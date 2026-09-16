#import <Foundation/Foundation.h>

typedef NSURLSessionConfiguration *_Nullable (^WorkletsURLSessionConfigurationProvider)(void);

/**
 * Installs a provider for the `NSURLSessionConfiguration` used by Worklet
 * Runtime networking. Use it to apply certificate pinning, custom protocol
 * classes or proxy settings to requests made from Worklet Runtimes, the same
 * way `RCTSetCustomNSURLSessionConfigurationProvider` does for React Native.
 * Must be called before the first request is sent.
 */
#if __cplusplus
extern "C"
#endif
    void WorkletsSetCustomNSURLSessionConfigurationProvider(WorkletsURLSessionConfigurationProvider _Nullable provider);

#if __cplusplus

#import <worklets/Networking/NetworkingBackend.h>

#import <memory>

NS_ASSUME_NONNULL_BEGIN

@interface WorkletsURLSessionDelegate : NSObject <NSURLSessionDataDelegate>

- (void)sendRequest:(worklets::RequestConfig &&)config
          requestId:(uint64_t)requestId
           listener:(const std::shared_ptr<worklets::NetworkRequestListener> &)listener;
- (void)abortRequest:(uint64_t)requestId;
- (void)invalidate;

@end

NS_ASSUME_NONNULL_END

#endif // __cplusplus
