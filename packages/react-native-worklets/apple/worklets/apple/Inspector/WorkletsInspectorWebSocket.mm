#import <worklets/Inspector/WorkletsInspectorConfig.h>
#import <worklets/apple/Inspector/WorkletsInspectorWebSocket.h>

#import <jsinspector-modern/InspectorFlags.h>

#if TARGET_OS_IPHONE
#import <UIKit/UIKit.h>
#endif // TARGET_OS_IPHONE

#import <memory>
#import <optional>
#import <string>
#import <string_view>
#import <utility>

using namespace facebook::react::jsinspector_modern;

/**
 * Receives NSURLSession events for a single WebSocket task. Every callback is
 * delivered on the session's private delegate queue, never on the main queue.
 */
@interface WorkletsInspectorWebSocketDelegate : NSObject <NSURLSessionWebSocketDelegate>
- (instancetype)initWithDelegate:(std::weak_ptr<IWebSocketDelegate>)delegate;
- (void)receiveNextMessageFromTask:(NSURLSessionWebSocketTask *)task;
@end

@implementation WorkletsInspectorWebSocketDelegate {
  std::weak_ptr<IWebSocketDelegate> _delegate;
  BOOL _closed;
}

- (instancetype)initWithDelegate:(std::weak_ptr<IWebSocketDelegate>)delegate
{
  if (self = [super init]) {
    _delegate = std::move(delegate);
    _closed = NO;
  }
  return self;
}

- (void)receiveNextMessageFromTask:(NSURLSessionWebSocketTask *)task
{
  __weak WorkletsInspectorWebSocketDelegate *weakSelf = self;
  [task receiveMessageWithCompletionHandler:^(NSURLSessionWebSocketMessage *message, NSError *error) {
    WorkletsInspectorWebSocketDelegate *strongSelf = weakSelf;
    if (strongSelf == nil) {
      return;
    }
    if (error != nil) {
      [strongSelf failWithError:error];
      return;
    }
    if (message.type == NSURLSessionWebSocketMessageTypeString) {
      if (auto delegate = strongSelf->_delegate.lock()) {
        delegate->didReceiveMessage([message.string UTF8String]);
      }
    }
    [strongSelf receiveNextMessageFromTask:task];
  }];
}

- (void)failWithError:(NSError *)error
{
  if (_closed) {
    return;
  }
  _closed = YES;
  if (auto delegate = _delegate.lock()) {
    std::optional<int> posixCode;
    if ([error.domain isEqualToString:NSPOSIXErrorDomain]) {
      posixCode = static_cast<int>(error.code);
    }
    delegate->didFailWithError(posixCode, [[error localizedDescription] UTF8String]);
  }
}

- (void)URLSession:(NSURLSession *)session
          webSocketTask:(NSURLSessionWebSocketTask *)webSocketTask
    didOpenWithProtocol:(NSString *)protocol
{
  if (auto delegate = _delegate.lock()) {
    delegate->didOpen();
  }
}

- (void)URLSession:(NSURLSession *)session
       webSocketTask:(NSURLSessionWebSocketTask *)webSocketTask
    didCloseWithCode:(NSURLSessionWebSocketCloseCode)closeCode
              reason:(NSData *)reason
{
  if (_closed) {
    return;
  }
  _closed = YES;
  if (auto delegate = _delegate.lock()) {
    delegate->didClose();
  }
}

- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didCompleteWithError:(NSError *)error
{
  if (error != nil) {
    [self failWithError:error];
  }
}

@end

namespace worklets {

namespace {

class WorkletsInspectorWebSocket final : public IWebSocket {
 public:
  WorkletsInspectorWebSocket(const std::string &url, std::weak_ptr<IWebSocketDelegate> delegate)
      : delegate_([[WorkletsInspectorWebSocketDelegate alloc] initWithDelegate:std::move(delegate)])
  {
    NSOperationQueue *queue = [NSOperationQueue new];
    queue.maxConcurrentOperationCount = 1;
    queue.name = @"com.swmansion.worklets.inspector";
    session_ = [NSURLSession sessionWithConfiguration:[NSURLSessionConfiguration defaultSessionConfiguration]
                                             delegate:delegate_
                                        delegateQueue:queue];
    NSURL *nsUrl = [NSURL URLWithString:[NSString stringWithUTF8String:url.c_str()]];
    if (nsUrl == nil) {
      throw std::runtime_error("[Worklets] Invalid inspector URL: " + url);
    }
    task_ = [session_ webSocketTaskWithURL:nsUrl];
    [delegate_ receiveNextMessageFromTask:task_];
    [task_ resume];
  }

  ~WorkletsInspectorWebSocket() override
  {
    [task_ cancelWithCloseCode:NSURLSessionWebSocketCloseCodeNormalClosure reason:nil];
    [session_ finishTasksAndInvalidate];
  }

  void send(std::string_view message) override
  {
    NSString *string = [[NSString alloc] initWithBytes:message.data()
                                                length:message.size()
                                              encoding:NSUTF8StringEncoding];
    if (string == nil) {
      return;
    }
    [task_ sendMessage:[[NSURLSessionWebSocketMessage alloc] initWithString:string]
        completionHandler:^(NSError *error){}];
  }

 private:
  WorkletsInspectorWebSocketDelegate *delegate_;
  NSURLSession *session_;
  NSURLSessionWebSocketTask *task_;
};

NSString *percentEncoded(NSString *value)
{
  return [value stringByAddingPercentEncodingWithAllowedCharacters:NSCharacterSet.URLQueryAllowedCharacterSet];
}

} // namespace

std::shared_ptr<WorkletsInspectorConnection> makeWorkletsInspectorConnection(NSURL *bundleURL)
{
#ifdef WORKLETS_RN_WORKER_RUNTIME_TARGETS
  return nullptr;
#endif // WORKLETS_RN_WORKER_RUNTIME_TARGETS
  if (!InspectorFlags::getInstance().getFuseboxEnabled()) {
    return nullptr;
  }
  if (bundleURL == nil || bundleURL.host == nil || bundleURL.host.length == 0) {
    return nullptr;
  }

  NSString *scheme = [bundleURL.scheme isEqualToString:@"https"] ? @"wss" : @"ws";
  NSString *hostPort =
      bundleURL.port != nil ? [NSString stringWithFormat:@"%@:%@", bundleURL.host, bundleURL.port] : bundleURL.host;
  NSString *appName = [[NSBundle mainBundle] bundleIdentifier] ?: @"";
#if TARGET_OS_IPHONE
  NSString *deviceName = [[UIDevice currentDevice] name];
  NSString *vendorId = [[UIDevice currentDevice] identifierForVendor].UUIDString ?: @"";
#else
  NSString *deviceName = [[NSProcessInfo processInfo] hostName];
  NSString *vendorId = @"";
#endif // TARGET_OS_IPHONE
  NSString *deviceId = [NSString stringWithFormat:@"%@-%@-worklets", vendorId, appName];
  NSString *url = [NSString stringWithFormat:@"%@://%@/inspector/device?name=%@&app=%@&device=%@&profiling=false",
                                             scheme,
                                             hostPort,
                                             percentEncoded(deviceName),
                                             percentEncoded(appName),
                                             percentEncoded(deviceId)];

  return WorkletsInspectorConnection::getOrCreate(WorkletsInspectorConnection::Config{
      .url = [url UTF8String],
      .deviceName = [deviceName UTF8String],
      .appName = [appName UTF8String],
      .webSocketFactory =
          [](const std::string &socketUrl, std::weak_ptr<IWebSocketDelegate> delegate) {
            return std::make_unique<WorkletsInspectorWebSocket>(socketUrl, std::move(delegate));
          },
      .mainThreadExecutor =
          [](std::function<void()> &&callback) {
            auto sharedCallback = std::make_shared<std::function<void()>>(std::move(callback));
            dispatch_async(dispatch_get_main_queue(), ^{ (*sharedCallback)(); });
          },
  });
}

} // namespace worklets
