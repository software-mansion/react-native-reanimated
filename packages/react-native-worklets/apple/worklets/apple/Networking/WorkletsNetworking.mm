/*
 * This file is based on RCTNetworking.mm from React Native.
 */

#import <mutex>

#import <FBReactNativeSpec/FBReactNativeSpec.h>
#import <React/RCTAssert.h>
#import <React/RCTConvert.h>
#import <React/RCTLog.h>
#import <React/RCTNetworkTask.h>
#import <React/RCTNetworking.h>
#import <React/RCTUtils.h>
#import <worklets/apple/Networking/WorkletsNetworking.h>

#import <React/RCTHTTPRequestHandler.h>
#import <react/featureflags/ReactNativeFeatureFlags.h>

#import <React/RCTInspectorNetworkReporter.h>
#import <React/RCTNetworkPlugins.h>

#import <React-Core/React/RCTFollyConvert.h>
#import <React-jsi/jsi/JSIDynamic.h>

// TODO: Document thread switching because it's a mess right now...

typedef RCTURLRequestCancellationBlock (^WorkletsHTTPQueryResult)(NSError *error, NSDictionary<NSString *, id> *result);

@interface WorkletsNetworking ()

- (RCTURLRequestCancellationBlock)processDataForHTTPQuery:(NSDictionary<NSString *, id> *)data
                                           workletRuntime:(std::weak_ptr<worklets::WorkletRuntime>)workletRuntime
                                                 callback:(WorkletsHTTPQueryResult)callback;
@end

/**
 * Helper to convert FormData payloads into multipart/formdata requests.
 */
@interface WorkletsHTTPFormDataHelper : NSObject

@property (nonatomic, weak) WorkletsNetworking *networker;

@end

@implementation WorkletsHTTPFormDataHelper {
  NSMutableArray<NSDictionary<NSString *, id> *> *_parts;
  NSMutableData *_multipartBody;
  WorkletsHTTPQueryResult _callback;
  NSString *_boundary;
}

static NSString *WorkletsGenerateFormBoundary()
{
  const size_t boundaryLength = 70;
  const char *boundaryChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.";

  char *bytes = (char *)malloc(boundaryLength);
  if (!bytes) {
    // CWE - 391 : Unchecked error condition
    // https://www.cvedetails.com/cwe-details/391/Unchecked-Error-Condition.html
    // https://eli.thegreenplace.net/2009/10/30/handling-out-of-memory-conditions-in-c
    abort();
  }
  size_t charCount = strlen(boundaryChars);
  for (int i = 0; i < boundaryLength; i++) {
    bytes[i] = boundaryChars[arc4random_uniform((u_int32_t)charCount)];
  }
  return [[NSString alloc] initWithBytesNoCopy:bytes
                                        length:boundaryLength
                                      encoding:NSUTF8StringEncoding
                                  freeWhenDone:YES];
}

- (RCTURLRequestCancellationBlock)process:(NSArray<NSDictionary *> *)formData
                           workletRuntime:(std::weak_ptr<worklets::WorkletRuntime>)workletRuntime
                                 callback:(WorkletsHTTPQueryResult)callback
{
  if (formData.count == 0) {
    return callback(nil, nil);
  }

  _parts = [formData mutableCopy];
  _callback = callback;
  _multipartBody = [NSMutableData new];
  _boundary = WorkletsGenerateFormBoundary();

  for (NSUInteger i = 0; i < _parts.count; i++) {
    NSString *uri = _parts[i][@"uri"];
    if (uri && [[uri substringToIndex:@"ph:".length] caseInsensitiveCompare:@"ph:"] == NSOrderedSame) {
      uri = [RCTNetworkingPHUploadHackScheme stringByAppendingString:[uri substringFromIndex:@"ph".length]];
      NSMutableDictionary *mutableDict = [_parts[i] mutableCopy];
      mutableDict[@"uri"] = uri;
      _parts[i] = mutableDict;
    }
  }

  return [_networker processDataForHTTPQuery:_parts[0]
                              workletRuntime:workletRuntime
                                    callback:^(NSError *error, NSDictionary<NSString *, id> *result) {
                                      return [self handleResult:result workletRuntime:workletRuntime error:error];
                                    }];
}

- (RCTURLRequestCancellationBlock)handleResult:(NSDictionary<NSString *, id> *)result
                                workletRuntime:(std::weak_ptr<worklets::WorkletRuntime>)workletRuntime
                                         error:(NSError *)error
{
  if (error) {
    return _callback(error, nil);
  }

  // Start with boundary.
  [_multipartBody
      appendData:[[NSString stringWithFormat:@"--%@\r\n", _boundary] dataUsingEncoding:NSUTF8StringEncoding]];

  // Print headers.
  NSMutableDictionary<NSString *, NSString *> *headers = [_parts[0][@"headers"] mutableCopy];
  NSString *partContentType = result[@"contentType"];
  if (partContentType != nil && ![partContentType isEqual:[NSNull null]]) {
    headers[@"content-type"] = partContentType;
  }
  [headers enumerateKeysAndObjectsUsingBlock:^(NSString *parameterKey, NSString *parameterValue, BOOL *stop) {
    [self->_multipartBody appendData:[[NSString stringWithFormat:@"%@: %@\r\n", parameterKey, parameterValue]
                                         dataUsingEncoding:NSUTF8StringEncoding]];
  }];

  // Add the body.
  [_multipartBody appendData:[@"\r\n" dataUsingEncoding:NSUTF8StringEncoding]];
  [_multipartBody appendData:result[@"body"]];
  [_multipartBody appendData:[@"\r\n" dataUsingEncoding:NSUTF8StringEncoding]];

  [_parts removeObjectAtIndex:0];
  if (_parts.count) {
    return [_networker processDataForHTTPQuery:_parts[0]
                                workletRuntime:workletRuntime
                                      callback:^(NSError *err, NSDictionary<NSString *, id> *res) {
                                        return [self handleResult:res workletRuntime:workletRuntime error:err];
                                      }];
  }

  // We've processed the last item. Finish and return.
  [_multipartBody
      appendData:[[NSString stringWithFormat:@"--%@--\r\n", _boundary] dataUsingEncoding:NSUTF8StringEncoding]];
  NSString *contentType = [NSString stringWithFormat:@"multipart/form-data; boundary=%@", _boundary];
  return _callback(nil, @{@"body" : _multipartBody, @"contentType" : contentType});
}

@end

/**
 * Bridge module that provides the JS interface to the network stack.
 */
@implementation WorkletsNetworking {
  NSMutableDictionary<NSNumber *, RCTNetworkTask *> *_tasksByRequestID;
  NSLock *_tasksLock;
  std::mutex _handlersLock;
  NSArray<id<RCTURLRequestHandler>> *_handlers;
  //  NSArray<id<RCTURLRequestHandler>> * (^_handlersProvider)(RCTModuleRegistry *);
  //  NSMutableArray<id<RCTNetworkingRequestHandler>> *_requestHandlers;
  // NSMutableArray<id<RCTNetworkingResponseHandler>> *_responseHandlers;
  std::shared_ptr<worklets::RuntimeManager> runtimeManager_;
  RCTNetworking *rctNetworking_;
  //  dispatch_queue_t _requestQueue;
}

#pragma mark - JS API

- (void)jsiSendRequest:(jsi::Runtime &)rt
                jquery:(const facebook::jsi::Value &)jquery
        responseSender:(jsi::Function &&)responseSender
{
  auto originRuntime = runtimeManager_->getRuntime(&rt);
  if (!originRuntime) {
    return;
  }

  id query = facebook::react::TurboModuleConvertUtils::convertJSIValueToObjCObject(rt, jquery, nullptr);

  NSString *method = query[@"method"];
  NSString *url = query[@"url"];
  id data = query[@"data"];
  id headers = query[@"headers"];
  NSString *queryResponseType = query[@"responseType"];
  bool queryIncrementalUpdates = [RCTConvert BOOL:query[@"incrementalUpdates"]];
  double timeout = [RCTConvert double:query[@"timeout"]];
  bool withCredentials = [RCTConvert BOOL:query[@"withCredentials"]];

  NSDictionary *queryDict = @{
    @"method" : method,
    @"url" : url,
    @"data" : data,
    @"headers" : headers,
    @"responseType" : queryResponseType,
    @"incrementalUpdates" : @(queryIncrementalUpdates),
    @"timeout" : @(timeout),
    @"withCredentials" : @(withCredentials),
  };

  auto sharedResponseSender = std::make_shared<jsi::Function>(std::move(responseSender));

  // TODO: buildRequest returns a cancellation block, but there's currently
  // no way to invoke it, if, for example the request is cancelled while
  // loading a large file to build the request body
  [self buildRequest:queryDict
       workletRuntime:originRuntime
      completionBlock:^(NSURLRequest *request, jsi::Runtime &rt) {
        NSString *responseType = [RCTConvert NSString:queryDict[@"responseType"]];
        BOOL incrementalUpdates = [RCTConvert BOOL:queryDict[@"incrementalUpdates"]];
        jsi::Function responseSender = std::move(*sharedResponseSender);
        [self sendRequest:request
                  responseType:responseType
            incrementalUpdates:incrementalUpdates
                            rt:rt
                responseSender:std::move(responseSender)];
      }];
}

- (void)jsiAbortRequest:(double)requestID
{
  [_tasksLock lock];
  [_tasksByRequestID[[NSNumber numberWithDouble:requestID]] cancel];
  [_tasksByRequestID removeObjectForKey:[NSNumber numberWithDouble:requestID]];
  [_tasksLock unlock];
}

- (void)jsiClearCookies:(facebook::jsi::Runtime &)rt responseSender:(jsi::Function &&)responseSender
{
  NSHTTPCookieStorage *storage = [NSHTTPCookieStorage sharedHTTPCookieStorage];
  if (!storage.cookies.count) {
    responseSender.call(rt, jsi::Value(rt, false));
    return;
  }

  for (NSHTTPCookie *cookie in storage.cookies) {
    [storage deleteCookie:cookie];
  }
  responseSender.call(rt, jsi::Value(rt, true));
}

#pragma mark - internals

- (RCTURLRequestCancellationBlock)buildRequest:(NSDictionary<NSString *, id> *)query
                                workletRuntime:(std::weak_ptr<worklets::WorkletRuntime>)workletRuntime
                               completionBlock:(void (^)(NSURLRequest *request, jsi::Runtime &rt))completionBlock
{
  NSURL *URL = [RCTConvert NSURL:query[@"url"]]; // this is marked as nullable in JS, but should not be null
  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:URL];
  request.HTTPMethod = [RCTConvert NSString:RCTNilIfNull(query[@"method"])].uppercaseString ?: @"GET";
  request.HTTPShouldHandleCookies = [RCTConvert BOOL:query[@"withCredentials"]];

  if (request.HTTPShouldHandleCookies == YES) {
    // Load and set the cookie header.
    NSArray<NSHTTPCookie *> *cookies = [[NSHTTPCookieStorage sharedHTTPCookieStorage] cookiesForURL:URL];
    request.allHTTPHeaderFields = [NSHTTPCookie requestHeaderFieldsWithCookies:cookies];
  }

  // Set supplied headers.
  NSDictionary *headers = [RCTConvert NSDictionary:query[@"headers"]];
  [headers enumerateKeysAndObjectsUsingBlock:^(NSString *key, id value, BOOL *stop) {
    if (value) {
      [request addValue:[RCTConvert NSString:value] forHTTPHeaderField:key];
    }
  }];

  request.timeoutInterval = [RCTConvert NSTimeInterval:query[@"timeout"]];
  NSDictionary<NSString *, id> *data = [RCTConvert NSDictionary:RCTNilIfNull(query[@"data"])];
  NSString *trackingName = data[@"trackingName"];
  if (trackingName) {
    [NSURLProtocol setProperty:trackingName forKey:@"trackingName" inRequest:request];
  }
  return [self processDataForHTTPQuery:data
                        workletRuntime:workletRuntime
                              callback:^(NSError *error, NSDictionary<NSString *, id> *result) {
                                if (error) {
                                  RCTLogError(@"Error processing request body: %@", error);
                                  // Ideally we'd circle back to JS here and notify an error/abort on the request.
                                  return (RCTURLRequestCancellationBlock)nil;
                                }
                                request.HTTPBody = result[@"body"];
                                NSString *dataContentType = result[@"contentType"];
                                NSString *requestContentType = [request valueForHTTPHeaderField:@"Content-Type"];
                                BOOL isMultipart = ![dataContentType isEqual:[NSNull null]] &&
                                    [dataContentType hasPrefix:@"multipart"];

                                // For multipart requests we need to override caller-specified content type with one
                                // from the data object, because it contains the boundary string
                                if (dataContentType && ([requestContentType length] == 0 || isMultipart)) {
                                  [request setValue:dataContentType forHTTPHeaderField:@"Content-Type"];
                                }

                                // Gzip the request body
                                if ([request.allHTTPHeaderFields[@"Content-Encoding"] isEqualToString:@"gzip"]) {
                                  request.HTTPBody = RCTGzipData(request.HTTPBody, -1 /* default */);
                                  [request setValue:(@(request.HTTPBody.length)).description
                                      forHTTPHeaderField:@"Content-Length"];
                                }

                                // NSRequest default cache policy violate on `If-None-Match`, should allow the request
                                // to get 304 from server.
                                if (request.allHTTPHeaderFields[@"If-None-Match"]) {
                                  request.cachePolicy = NSURLRequestReloadIgnoringLocalCacheData;
                                }

                                //                                dispatch_async(self->_methodQueue, ^{
                                //                                  block(request);
                                //                                });
                                //                                self->uiScheduler_->scheduleOnUI([block, request](){
                                auto strongWorkletRuntime = workletRuntime.lock();
                                strongWorkletRuntime->runOnQueue(
                                    [completionBlock, request](jsi::Runtime &rt) { completionBlock(request, rt); });

                                return (RCTURLRequestCancellationBlock)nil;
                              }];
}

- (instancetype)init:(std::shared_ptr<worklets::RuntimeManager>)runtimeManager
       rctNetworking:(RCTNetworking *)rctNetworking
{
  self = [super init];
  if (self) {
    runtimeManager_ = runtimeManager;
    rctNetworking_ = rctNetworking;
    _tasksLock = [[NSLock alloc] init];
  }
  return self;
}

// TODO: Is it needed?
- (void)invalidate
{
  std::lock_guard<std::mutex> lock(_handlersLock);
  [_tasksLock lock];

  for (NSNumber *requestID in _tasksByRequestID) {
    [_tasksByRequestID[requestID] cancel];
  }
  [_tasksByRequestID removeAllObjects];
  for (id<RCTURLRequestHandler> handler in _handlers) {
    if ([handler conformsToProtocol:@protocol(RCTInvalidating)]) {
      [(id<RCTInvalidating>)handler invalidate];
    }
  }
  [_tasksLock unlock];
  //  _handlers = nil;
  //  _requestHandlers = nil;
  //  _responseHandlers = nil;
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[
    @"didCompleteNetworkResponse",
    @"didReceiveNetworkResponse",
    @"didSendNetworkData",
    @"didReceiveNetworkIncrementalData",
    @"didReceiveNetworkDataProgress",
    @"didReceiveNetworkData"
  ];
}

- (NSDictionary<NSString *, id> *)stripNullsInRequestHeaders:(NSDictionary<NSString *, id> *)headers
{
  NSMutableDictionary *result = [NSMutableDictionary dictionaryWithCapacity:headers.count];
  for (NSString *key in headers.allKeys) {
    id val = headers[key];
    if (val != [NSNull null]) {
      result[key] = val;
    }
  }

  return result;
}

/**
 * Process the 'data' part of an HTTP query.
 *
 * 'data' can be a JSON value of the following forms:
 *
 * - {"string": "..."}: a simple JS string that will be UTF-8 encoded and sent as the body
 *
 * - {"uri": "some-uri://..."}: reference to a system resource, e.g. an image in the asset library
 *
 * - {"formData": [...]}: list of data payloads that will be combined into a multipart/form-data request
 *
 * - {"blob": {...}}: an object representing a blob
 *
 * If successful, the callback be called with a result dictionary containing the following (optional) keys:
 *
 * - @"body" (NSData): the body of the request
 *
 * - @"contentType" (NSString): the content type header of the request
 *
 */
- (RCTURLRequestCancellationBlock)
    processDataForHTTPQuery:(nullable NSDictionary<NSString *, id> *)query
             workletRuntime:(std::weak_ptr<worklets::WorkletRuntime>)workletRuntime
                   callback:(RCTURLRequestCancellationBlock (^)(NSError *error, NSDictionary<NSString *, id> *result))
                                callback
{
  if (!query) {
    return callback(nil, nil);
  }
  //  for (id<RCTNetworkingRequestHandler> handler in _requestHandlers) {
  //    if ([handler canHandleNetworkingRequest:query]) {
  //      NSDictionary *body = [handler handleNetworkingRequest:query];
  //      if (body) {
  //        return callback(nil, body);
  //      }
  //    }
  //  }
  NSData *body = [RCTConvert NSData:query[@"string"]];
  if (body) {
    return callback(nil, @{@"body" : body});
  }
  NSString *base64String = [RCTConvert NSString:query[@"base64"]];
  if (base64String) {
    NSData *data = [[NSData alloc] initWithBase64EncodedString:base64String options:0];
    return callback(nil, @{@"body" : data});
  }
  NSURLRequest *request = [RCTConvert NSURLRequest:query[@"uri"]];
  if (request) {
    __block RCTURLRequestCancellationBlock cancellationBlock = nil;
    RCTNetworkTask *task = [self->rctNetworking_
        networkTaskWithRequest:request
               completionBlock:^(NSURLResponse *response, NSData *data, NSError *error) {
                 // TODO: Fix
                 //  dispatch_async(self->_methodQueue, ^{
                 //                       dispatch_async(dispatch_get_main_queue(), ^{
                 auto strongWorkletRuntime = workletRuntime.lock();
                 if (!strongWorkletRuntime) {
                   return;
                 }

                 strongWorkletRuntime->runOnQueue(^{
                   cancellationBlock = callback(
                       error, data ? @{@"body" : data, @"contentType" : RCTNullIfNil(response.MIMEType)} : nil);
                 });
               }];

    [task start];

    __weak RCTNetworkTask *weakTask = task;
    return ^{
      [weakTask cancel];
      if (cancellationBlock) {
        cancellationBlock();
      }
    };
  }
  NSArray<NSDictionary *> *formData = [RCTConvert NSDictionaryArray:query[@"formData"]];
  if (formData) {
    // TODO: FIX
    WorkletsHTTPFormDataHelper *formDataHelper = [WorkletsHTTPFormDataHelper new];
    formDataHelper.networker = self;
    return [formDataHelper process:formData workletRuntime:workletRuntime callback:callback];
  }
  // Nothing in the data payload, at least nothing we could understand anyway.
  // Ignore and treat it as if it were null.
  return callback(nil, nil);
}

+ (NSString *)decodeTextData:(NSData *)data
                fromResponse:(NSURLResponse *)response
               withCarryData:(NSMutableData *)inputCarryData
{
  NSStringEncoding encoding = NSUTF8StringEncoding;
  if (response.textEncodingName) {
    CFStringEncoding cfEncoding = CFStringConvertIANACharSetNameToEncoding((CFStringRef)response.textEncodingName);
    encoding = CFStringConvertEncodingToNSStringEncoding(cfEncoding);
  }

  NSMutableData *currentCarryData = inputCarryData ?: [NSMutableData new];
  [currentCarryData appendData:data];

  // Attempt to decode text
  NSString *encodedResponse = [[NSString alloc] initWithData:currentCarryData encoding:encoding];

  if (!encodedResponse && data.length > 0) {
    if (encoding == NSUTF8StringEncoding && inputCarryData) {
      // If decode failed, we attempt to trim broken character bytes from the data.
      // At this time, only UTF-8 support is enabled. Multibyte encodings, such as UTF-16 and UTF-32, require a lot of
      // additional work to determine wether BOM was included in the first data packet. If so, save it, and attach it to
      // each new data packet. If not, an encoding has to be selected with a suitable byte order (for ARM iOS, it would
      // be little endianness).

      CFStringEncoding cfEncoding = CFStringConvertNSStringEncodingToEncoding(encoding);
      // Taking a single unichar is not good enough, due to Unicode combining character sequences or characters outside
      // the BMP. See https://www.objc.io/issues/9-strings/unicode/#common-pitfalls We'll attempt with a sequence of two
      // characters, the most common combining character sequence and characters outside the BMP (emojis).
      CFIndex maxCharLength = CFStringGetMaximumSizeForEncoding(2, cfEncoding);

      NSUInteger removedBytes = 1;

      while (removedBytes < maxCharLength) {
        encodedResponse = [[NSString alloc]
            initWithData:[currentCarryData subdataWithRange:NSMakeRange(0, currentCarryData.length - removedBytes)]
                encoding:encoding];

        if (encodedResponse != nil) {
          break;
        }

        removedBytes += 1;
      }
    } else {
      // We don't have an encoding, or the encoding is incorrect, so now we try to guess
      [NSString stringEncodingForData:data
                      encodingOptions:@{NSStringEncodingDetectionSuggestedEncodingsKey : @[ @(encoding) ]}
                      convertedString:&encodedResponse
                  usedLossyConversion:NULL];
    }
  }

  if (inputCarryData) {
    NSUInteger encodedResponseLength = [encodedResponse dataUsingEncoding:encoding].length;

    // Ensure a valid subrange exists within currentCarryData
    if (currentCarryData.length >= encodedResponseLength) {
      NSData *newCarryData = [currentCarryData
          subdataWithRange:NSMakeRange(encodedResponseLength, currentCarryData.length - encodedResponseLength)];
      [inputCarryData setData:newCarryData];
    } else {
      [inputCarryData setLength:0];
    }
  }

  return encodedResponse;
}

- (void)sendData:(NSData *)data
    responseType:(NSString *)responseType
        response:(NSURLResponse *)response
         forTask:(RCTNetworkTask *)task
              rt:(facebook::jsi::Runtime &)rt
{
  id responseData = nil;
  // TODO: ???
  //  for (id<RCTNetworkingResponseHandler> handler in _responseHandlers) {
  //    if ([handler canHandleNetworkingResponse:responseType]) {
  //      responseData = [handler handleNetworkingResponse:response data:data];
  //      break;
  //    }
  //  }

  if (!responseData) {
    if (data.length == 0) {
      return;
    }

    if ([responseType isEqualToString:@"text"]) {
      // No carry storage is required here because the entire data has been loaded.
      responseData = [WorkletsNetworking decodeTextData:data fromResponse:task.response withCarryData:nil];
      if (!responseData) {
        RCTLogWarn(@"Received data was not a string, or was not a recognised encoding.");
        return;
      }
    } else if ([responseType isEqualToString:@"base64"]) {
      responseData = [data base64EncodedStringWithOptions:0];
    } else {
      RCTLogWarn(@"Invalid responseType: %@", responseType);
      return;
    }
  }

  [self emitDeviceEvent:@"didReceiveNetworkData" argFactory:@[ task.requestID, responseData ] rt:rt];
}

- (void)sendRequest:(NSURLRequest *)request
          responseType:(NSString *)responseType
    incrementalUpdates:(BOOL)incrementalUpdates
                    rt:(facebook::jsi::Runtime &)rt
        responseSender:(jsi::Function &&)responseSender
{
  __weak __typeof(self) weakSelf = self;
  __block RCTNetworkTask *task;
  RCTURLRequestProgressBlock uploadProgressBlock = ^(int64_t progress, int64_t total) {
    NSArray *responseJSON = @[ task.requestID, @((double)progress), @((double)total) ];
    [weakSelf emitDeviceEvent:@"didSendNetworkData" argFactory:responseJSON rt:rt];
  };

  RCTURLRequestResponseBlock responseBlock = ^(NSURLResponse *response) {
    NSDictionary<NSString *, NSString *> *headers;
    NSInteger status;
    if ([response isKindOfClass:[NSHTTPURLResponse class]]) {
      NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *)response;
      headers = httpResponse.allHeaderFields ?: @{};
      status = httpResponse.statusCode;
    } else {
      // Other HTTP-like request
      headers = response.MIMEType ? @{@"Content-Type" : response.MIMEType} : @{};
      status = 200;
    }
    id responseURL = response.URL ? response.URL.absoluteString : [NSNull null];
    NSArray<id> *responseJSON = @[ task.requestID, @(status), headers, responseURL ];

    if (facebook::react::ReactNativeFeatureFlags::enableNetworkEventReporting()) {
      [RCTInspectorNetworkReporter reportResponseStart:task.requestID
                                              response:response
                                            statusCode:(int)status
                                               headers:headers];
    }
    [weakSelf emitDeviceEvent:@"didReceiveNetworkResponse" argFactory:responseJSON rt:rt];
  };

  // XHR does not allow you to peek at xhr.response before the response is
  // finished. Only when xhr.responseType is set to ''/'text', consumers may
  // peek at xhr.responseText. So unless the requested responseType is 'text',
  // we only send progress updates and not incremental data updates to JS here.
  RCTURLRequestIncrementalDataBlock incrementalDataBlock = nil;
  RCTURLRequestProgressBlock downloadProgressBlock = nil;
  if (incrementalUpdates) {
    if ([responseType isEqualToString:@"text"]) {
      // We need this to carry over bytes, which could not be decoded into text (such as broken UTF-8 characters).
      // The incremental data block holds the ownership of this object, and will be released upon release of the block.
      NSMutableData *incrementalDataCarry = [NSMutableData new];

      incrementalDataBlock = ^(NSData *data, int64_t progress, int64_t total) {
        NSUInteger initialCarryLength = incrementalDataCarry.length;

        NSString *responseString = [WorkletsNetworking decodeTextData:data
                                                            fromResponse:task.response
                                                           withCarryData:incrementalDataCarry];
        if (!responseString) {
          RCTLogWarn(@"Received data was not a string, or was not a recognised encoding.");
          return;
        }

        // Update progress to include the previous carry length and reduce the current carry length.
        NSArray<id> *responseJSON = @[
          task.requestID,
          responseString,
          @(progress + initialCarryLength - incrementalDataCarry.length),
          @(total)
        ];

        [weakSelf emitDeviceEvent:@"didReceiveNetworkIncrementalData" argFactory:responseJSON rt:rt];
      };
    } else {
      downloadProgressBlock = ^(int64_t progress, int64_t total) {
        NSArray<id> *responseJSON = @[ task.requestID, @(progress), @(total) ];
        [weakSelf emitDeviceEvent:@"didReceiveNetworkDataProgress" argFactory:responseJSON rt:rt];
      };
    }
  }

  RCTURLRequestCompletionBlock completionBlock = ^(NSURLResponse *response, NSData *data, NSError *error) {
    __typeof(self) strongSelf = weakSelf;
    if (!strongSelf) {
      return;
    }

    // Unless we were sending incremental (text) chunks to JS, all along, now
    // is the time to send the request body to JS.
    if (!(incrementalUpdates && [responseType isEqualToString:@"text"])) {
      [strongSelf sendData:data responseType:responseType response:response forTask:task rt:rt];
    }
    NSArray *responseJSON =
        @[ task.requestID, RCTNullIfNil(error.localizedDescription), error.code == kCFURLErrorTimedOut ? @YES : @NO ];

    if (facebook::react::ReactNativeFeatureFlags::enableNetworkEventReporting()) {
      [RCTInspectorNetworkReporter reportResponseEnd:task.requestID encodedDataLength:(int)data.length];
    }
    [strongSelf emitDeviceEvent:@"didCompleteNetworkResponse" argFactory:responseJSON rt:rt];
    
    [strongSelf->_tasksLock lock];
    [strongSelf->_tasksByRequestID removeObjectForKey:task.requestID];
    [strongSelf->_tasksLock unlock];
  };

  task = [self->rctNetworking_ networkTaskWithRequest:request completionBlock:completionBlock];
  task.downloadProgressBlock = downloadProgressBlock;
  task.incrementalDataBlock = incrementalDataBlock;
  task.responseBlock = responseBlock;
  task.uploadProgressBlock = uploadProgressBlock;

  if (task.requestID) {
    [_tasksLock lock];
    if (!_tasksByRequestID) {
      _tasksByRequestID = [NSMutableDictionary new];
    }
    _tasksByRequestID[task.requestID] = task;
    [_tasksLock unlock];
    auto workletRuntime = runtimeManager_->getRuntime(&rt);
    auto value = task.requestID.doubleValue;

    responseSender.call(rt, jsi::Value(rt, value));

    if (facebook::react::ReactNativeFeatureFlags::enableNetworkEventReporting()) {
      [RCTInspectorNetworkReporter reportRequestStart:task.requestID
                                              request:request
                                    encodedDataLength:(int)task.response.expectedContentLength];
    }
  }

  [task start];
}

using ArgFactory = std::function<void(facebook::jsi::Runtime &runtime, std::vector<facebook::jsi::Value> &args)>;

- (void)emitDeviceEvent:(NSString *)eventName argFactory:(id)argFactory rt:(facebook::jsi::Runtime &)rt

{
  facebook::jsi::Value emitter = rt.global().getProperty(rt, "__rctDeviceEventEmitter");
  if (!emitter.isUndefined()) {
    facebook::jsi::Object emitterObject = emitter.asObject(rt);
    // TODO: consider caching these
    facebook::jsi::Function emitFunction = emitterObject.getPropertyAsFunction(rt, "emit");
    std::vector<facebook::jsi::Value> args;
    args.emplace_back(facebook::jsi::String::createFromAscii(rt, eventName.UTF8String));
    if (argFactory) {
      auto fly = facebook::react::convertIdToFollyDynamic(argFactory);
      auto event = facebook::jsi::valueFromDynamic(rt, fly);

      args.emplace_back(std::move(event));
    }

    emitFunction.callWithThis(rt, emitterObject, static_cast<const jsi::Value *>(args.data()), args.size());
  }
}

@end
