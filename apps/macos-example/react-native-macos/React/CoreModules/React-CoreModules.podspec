# Copyright (c) Meta Platforms, Inc. and affiliates.
#
# This source code is licensed under the MIT license found in the
# LICENSE file in the root directory of this source tree.

require "json"

package = JSON.parse(File.read(File.join(__dir__, "..", "..", "package.json")))
version = package['version']

source = { :git => 'https://github.com/facebook/react-native.git' }
if version == '1000.0.0'
  # This is an unpublished version, use the latest commit hash of the react-native repo, which we’re presumably in.
  source[:commit] = `git rev-parse HEAD`.strip if system("git rev-parse --git-dir > /dev/null 2>&1")
else
  source[:tag] = "v#{version}"
end

folly_compiler_flags = '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -DFOLLY_CFG_NO_COROUTINES=1 -Wno-comma -Wno-shorten-64-to-32'
folly_version = '2022.05.16.00'
socket_rocket_version = '0.7.0' # [macOS] [visionOS]

header_search_paths = [
  "\"$(PODS_TARGET_SRCROOT)/React/CoreModules\"",
  "\"$(PODS_ROOT)/RCT-Folly\"",
  "\"${PODS_ROOT}/Headers/Public/React-Codegen/react/renderer/components\"",
]

Pod::Spec.new do |s|
  s.name                   = "React-CoreModules"
  s.version                = version
  s.summary                = "-"  # TODO
  s.homepage               = "https://reactnative.dev/"
  s.license                = package["license"]
  s.author                 = "Meta Platforms, Inc. and its affiliates"
  s.platforms              = min_supported_versions
  s.compiler_flags         = folly_compiler_flags + ' -Wno-nullability-completeness'
  s.source                 = source
  s.source_files           = "**/*.{c,m,mm,cpp}"
  # [macOS
                             "**/MacOS/*"
  s.osx.exclude_files     =  "{RCTFPSGraph,RCTPerfMonitor,RCTPlatform}.*"
  # macOS]
  s.header_dir             = "CoreModules"
  s.pod_target_xcconfig    = {
                               "USE_HEADERMAP" => "YES",
                               "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
                               "HEADER_SEARCH_PATHS" => header_search_paths.join(" ")
                             }
  s.ios.framework = "UIKit" # [macOS] Restrict to iOS
  s.dependency "RCT-Folly", folly_version
  s.dependency "RCTTypeSafety", version
  s.dependency "React-Core/CoreModulesHeaders", version
  s.dependency "React-RCTImage", version
  s.dependency "React-jsi", version
  s.dependency 'React-RCTBlob'
  s.dependency "SocketRocket", socket_rocket_version

  add_dependency(s, "React-Codegen")
  add_dependency(s, "ReactCommon", :subspec => "turbomodule/core", :additional_framework_paths => ["react/nativemodule/core"])
  add_dependency(s, "React-NativeModulesApple")
end
