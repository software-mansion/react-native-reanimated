#import <Foundation/Foundation.h>

#import <worklets/Tools/ScriptBuffer.h>

#import <memory>

namespace worklets {

std::shared_ptr<const ScriptBuffer> getScript(NSURL *url, NSURL *downloadedBundleFileURL);

} // namespace worklets
