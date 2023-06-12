require "json"
require_relative './scripts/reanimated_utils'

reanimated_package_json = JSON.parse(File.read(File.join(__dir__, "package.json")))
config = find_config()
assert_no_multiple_instances(config)
assert_no_reanimated2_with_new_architecture(reanimated_package_json)
assert_latest_react_native_with_new_architecture(config, reanimated_package_json)

fabric_enabled = ENV['RCT_NEW_ARCH_ENABLED'] == '1'
folly_prefix = config[:react_native_minor_version] >= 64 ? 'RCT-' : ''
folly_flags = '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -Wno-comma -Wno-shorten-64-to-32 -DREACT_NATIVE_MINOR_VERSION=' + config[:react_native_minor_version].to_s
folly_compiler_flags = folly_flags + ' ' + '-Wno-comma -Wno-shorten-64-to-32'
boost_compiler_flags = '-Wno-documentation'
fabric_flags = fabric_enabled ? '-DRCT_NEW_ARCH_ENABLED' : ''
example_flag = config[:is_reanimated_example_app] ? '-DIS_REANIMATED_EXAMPLE_APP' : ''
version_flag = '-DREANIMATED_VERSION=' + reanimated_package_json["version"]
using_hermes = ENV['USE_HERMES'] == nil || ENV['USE_HERMES'] == '1'

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
    "HEADER_SEARCH_PATHS" => "\"$(PODS_TARGET_SRCROOT)/ReactCommon\" \"$(PODS_TARGET_SRCROOT)\" \"$(PODS_ROOT)/#{folly_prefix}Folly\" \"$(PODS_ROOT)/boost\" \"$(PODS_ROOT)/boost-for-react-native\" \"$(PODS_ROOT)/DoubleConversion\" \"$(PODS_ROOT)/Headers/Private/React-Core\"",
    "FRAMEWORK_SEARCH_PATHS" => "\"${PODS_CONFIGURATION_BUILD_DIR}/React-hermes\"",
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
  }
  s.compiler_flags = folly_compiler_flags + ' ' + boost_compiler_flags + ' -DHERMES_ENABLE_DEBUGGER'
  s.xcconfig = {
    "HEADER_SEARCH_PATHS" => "\"$(PODS_ROOT)/boost\" \"$(PODS_ROOT)/boost-for-react-native\" \"$(PODS_ROOT)/glog\" \"$(PODS_ROOT)/#{folly_prefix}Folly\" \"$(PODS_ROOT)/Headers/Public/React-hermes\" \"$(PODS_ROOT)/Headers/Public/hermes-engine\" \"$(PODS_ROOT)/#{config[:react_native_common_dir]}\"",
    "OTHER_CFLAGS" => "$(inherited)" + " " + folly_flags + " " + fabric_flags + " " + example_flag + " " + version_flag
  }

  s.requires_arc = true

  s.dependency "React-Core"
  if fabric_enabled
    s.dependency "React-RCTFabric"
    s.dependency "React-Codegen"
    s.dependency "RCT-Folly"
  else
    s.dependency "#{folly_prefix}Folly"
  end
  s.dependency "RCTRequired"
  s.dependency "RCTTypeSafety"
  s.dependency "ReactCommon/turbomodule/core"
  s.dependency 'FBLazyVector'
  if config[:react_native_minor_version] <= 71
    s.dependency 'FBReactNativeSpec'
  end
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
  s.dependency 'Yoga'
  s.dependency 'DoubleConversion'
  s.dependency 'glog'
  if using_hermes && !config[:is_tvos_target]
    s.dependency 'React-hermes'
    s.dependency 'hermes-engine'
  end

  if config[:react_native_minor_version] == 62
    s.dependency 'ReactCommon/callinvoker'
  else
    s.dependency 'React-callinvoker'
  end

  if config[:react_native_minor_version] >= 72 && !fabric_enabled
    s.dependency 'React-RCTAppDelegate'
  end
end
