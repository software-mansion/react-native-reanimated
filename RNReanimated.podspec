require "json"
require_relative './scripts/reanimated_utils'

reanimated_package_json = JSON.parse(File.read(File.join(__dir__, "package.json")))
config = find_config()
assert_no_multiple_instances(config)
assert_no_reanimated2_with_new_architecture(reanimated_package_json)

folly_prefix = config[:react_native_minor_version] >= 64 ? 'RCT-' : ''
folly_flags = '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -Wno-comma -Wno-shorten-64-to-32 -DREACT_NATIVE_MINOR_VERSION=' + config[:react_native_minor_version].to_s
folly_compiler_flags = folly_flags + ' ' + '-Wno-comma -Wno-shorten-64-to-32'
boost_compiler_flags = '-Wno-documentation'

Pod::Spec.new do |s|
  
  s.name         = "RNReanimated"
  s.version      = reanimated_package_json["version"]
  s.summary      = reanimated_package_json["description"]
  s.description  = <<-DESC
                  RNReanimated
                   DESC
  s.homepage     = "https://github.com/software-mansion/react-native-reanimated"
  s.license      = "MIT"
  # s.license    = { :type => "MIT", :file => "FILE_LICENSE" }
  s.author       = { "author" => "author@domain.cn" }
  s.platforms    = { :ios => "9.0", :tvos => "9.0" }
  s.source       = { :git => "https://github.com/software-mansion/react-native-reanimated.git", :tag => "#{s.version}" }

  s.source_files = [
    "ios/**/*.{mm,h,m}",
    "Common/cpp/**/*.{cpp,h}"
  ]

  s.preserve_paths = [
    "Common/cpp/hidden_headers/**"
  ]

  s.pod_target_xcconfig = {
    "USE_HEADERMAP" => "YES",
    "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)/ReactCommon\" \"$(PODS_TARGET_SRCROOT)\" \"$(PODS_ROOT)/#{folly_prefix}Folly\" \"$(PODS_ROOT)/boost\" \"$(PODS_ROOT)/boost-for-react-native\" \"$(PODS_ROOT)/DoubleConversion\" \"$(PODS_ROOT)/Headers/Private/React-Core\" ",
    "FRAMEWORK_SEARCH_PATHS" => "\"${PODS_CONFIGURATION_BUILD_DIR}/React-hermes\"",
  }
  s.compiler_flags = folly_compiler_flags + ' ' + boost_compiler_flags
  s.xcconfig               = {
    "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)/boost\" \"$(PODS_ROOT)/boost-for-react-native\" \"$(PODS_ROOT)/glog\" \"$(PODS_ROOT)/#{folly_prefix}Folly\" \"$(PODS_ROOT)/RCT-Folly\" \"${PODS_ROOT}/Headers/Public/React-hermes\" \"${PODS_ROOT}/Headers/Public/hermes-engine\" \"$(PODS_ROOT)/#{config[:react_native_common_dir]}\"",
    "OTHER_CFLAGS" => "$(inherited)" + " " + folly_flags 
  }

  s.requires_arc = true

  s.dependency "React-Core"
  s.dependency "#{folly_prefix}Folly"
  s.dependency "RCTRequired"
  s.dependency "RCTTypeSafety"
  s.dependency "ReactCommon/turbomodule/core"
  s.dependency 'FBLazyVector'
  s.dependency 'FBReactNativeSpec'
  s.dependency 'RCTRequired'
  s.dependency 'RCTTypeSafety'
  s.dependency 'React-Core'
  s.dependency 'React-CoreModules'
  s.dependency 'React-Core/DevSupport'
  if !config[:is_tvos_target]
    s.dependency 'React-RCTActionSheet'
  end
  s.dependency 'React-RCTNetwork'
  s.dependency 'React-RCTAnimation'
  s.dependency 'React-RCTLinking'
  s.dependency 'React-RCTBlob'
  s.dependency 'React-RCTSettings'
  s.dependency 'React-RCTText'
  s.dependency 'React-RCTImage'
  s.dependency 'React-Core/RCTWebSocket'
  s.dependency 'React-cxxreact'
  s.dependency 'React-jsi'
  s.dependency 'React-jsiexecutor'
  s.dependency 'React-jsinspector'
  s.dependency 'ReactCommon/turbomodule/core'
  s.dependency 'Yoga'
  s.dependency 'DoubleConversion'
  s.dependency 'glog'

  if config[:react_native_minor_version] == 62
    s.dependency 'ReactCommon/callinvoker'
  else
    s.dependency 'React-callinvoker'
  end
end
