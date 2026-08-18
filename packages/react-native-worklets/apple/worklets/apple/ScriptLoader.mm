#import <worklets/apple/ScriptLoader.h>

namespace worklets {
namespace {

class NSDataScript : public JSBigString {
 public:
  explicit NSDataScript(NSData *data) : data_(data), size_([data length]) {}

  bool isAscii() const override
  {
    return false;
  }

  const char *c_str() const override
  {
    return static_cast<const char *>(data_.bytes);
  }

  size_t size() const override
  {
    return size_;
  }

 private:
  NSData *data_;
  size_t size_;
};

NSData *loadScriptFromFile(NSURL *url)
{
  NSError *error;
  NSData *data = [NSData dataWithContentsOfFile:url.path options:NSDataReadingMappedIfSafe error:&error];

  if (data == nil) [[unlikely]] {
    NSString *errorMsg = [NSString stringWithFormat:@"[Worklets] Failed to load worklets bundle from file %@: %@",
                                                    url.path,
                                                    error.localizedDescription];
    NSLog(@"%@", errorMsg);
    throw std::runtime_error([errorMsg UTF8String]);
  }

  return data;
}

NSData *downloadScript(NSURL *url)
{
  dispatch_semaphore_t semaphore = dispatch_semaphore_create(0);
  __block NSData *data = nil;
  __block NSURLResponse *response = nil;
  __block NSError *error = nil;

  NSURLSessionDataTask *task = [[NSURLSession sharedSession]
        dataTaskWithURL:url
      completionHandler:^(NSData *taskData, NSURLResponse *taskResponse, NSError *taskError) {
        data = taskData;
        response = taskResponse;
        error = taskError;
        dispatch_semaphore_signal(semaphore);
      }];
  [task resume];
  dispatch_semaphore_wait(semaphore, DISPATCH_TIME_FOREVER);

  if (error != nil) [[unlikely]] {
    NSString *errorMsg;
    if ([error.domain isEqualToString:NSURLErrorDomain]) {
      errorMsg = @"[Worklets] Could not connect to development server.\n";
    } else {
      errorMsg = [NSString stringWithFormat:@"[Worklets] Failed to load worklets bundle from URL %@: %@",
                                            url,
                                            error.localizedDescription];
    }
    NSLog(@"%@", errorMsg);
    throw std::runtime_error([errorMsg UTF8String]);
  }

  NSInteger statusCode =
      [response isKindOfClass:[NSHTTPURLResponse class]] ? [(NSHTTPURLResponse *)response statusCode] : 200;
  if (statusCode != 200) [[unlikely]] {
    NSString *description = nil;
    NSDictionary *jsonError = data != nil ? [NSJSONSerialization JSONObjectWithData:data options:0 error:nil] : nil;
    if ([jsonError isKindOfClass:[NSDictionary class]] && [jsonError[@"message"] isKindOfClass:[NSString class]] &&
        [jsonError[@"message"] length] > 0) {
      description = jsonError[@"message"];
    } else {
      description = [NSString stringWithFormat:@"Received status code %ld while fetching the bundle", (long)statusCode];
    }
    NSString *errorMsg =
        [NSString stringWithFormat:@"[Worklets] Failed to load worklets bundle from URL %@: %@", url, description];
    NSLog(@"%@", errorMsg);
    throw std::runtime_error([errorMsg UTF8String]);
  }

  NSString *mimeType = response.MIMEType;
  if (![mimeType isEqualToString:@"application/javascript"] && ![mimeType isEqualToString:@"text/javascript"])
      [[unlikely]] {
    NSString *errorMsg = [NSString
        stringWithFormat:
            @"[Worklets] Expected MIME-Type of the worklets bundle to be 'application/javascript' or 'text/javascript', but got '%@'",
            mimeType];
    NSLog(@"%@", errorMsg);
    throw std::runtime_error([errorMsg UTF8String]);
  }

  return data;
}

} // namespace

std::shared_ptr<const ScriptBuffer> getScript(NSURL *url)
{
  if (url == nil) [[unlikely]] {
    NSString *errorMsg =
        @"[Worklets] No script URL provided. Make sure the packager is running or you have embedded a "
        @"JS bundle in your application bundle.";
    NSLog(@"%@", errorMsg);
    throw std::runtime_error([errorMsg UTF8String]);
  }

  NSData *data = url.isFileURL ? loadScriptFromFile(url) : downloadScript(url);
  return std::make_shared<const ScriptBuffer>(std::make_shared<const NSDataScript>(data));
}

} // namespace worklets
