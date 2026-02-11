require "json"
require_relative './scripts/worklets_utils'

package = JSON.parse(File.read(File.join(__dir__, "package.json")))
$worklets_config = worklets_find_config()
worklets_assert_minimal_react_native_version($worklets_config)

$new_arch_enabled = ENV['RCT_NEW_ARCH_ENABLED'] != '0'
worklets_assert_new_architecture_enabled($new_arch_enabled)

ios_min_version = '13.4'

feature_flags = $worklets_config[:feature_flags_flag]
version_flags = "-DWORKLETS_VERSION=#{package['version']} -DREACT_NATIVE_MINOR_VERSION=#{$worklets_config[:react_native_minor_version]}"
worklets_profiling_flag = ENV['IS_WORKLETS_PROFILING'] ? '-DWORKLETS_PROFILING' : ''
bundle_mode_flag = $worklets_config[:bundle_mode_flag]
fetch_preview_flag = $worklets_config[:fetch_preview_flag]
hermes_v1_flag = ENV['RCT_HERMES_V1_ENABLED'] == '1' ? '-DHERMES_V1_ENABLED' : ''

# React Native doesn't expose these flags, but not having them
# can lead to runtime errors due to ABI mismatches.
# There's also
#   HERMESVM_PROFILER_OPCODE
#   HERMESVM_PROFILER_BB
# which shouldn't be defined in standard setups.
hermes_debug_hidden_flags = 'HERMES_ENABLE_DEBUGGER=1'

Pod::Spec.new do |s|
  s.name         = "RNWorklets"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/software-mansion/react-native-reanimated"
  s.license      = package["license"]
  s.authors      = { "author" => "author@domain.com" }
  s.platforms    = { :ios => ios_min_version, :tvos => "9.0", :osx => "10.14", :visionos => "1.0" }
  s.source       = { :git => "https://github.com/software-mansion/react-native-reanimated.git", :tag => "#{s.version}" }

  s.header_dir = "worklets"

  s.subspec "common" do |ss|
    ss.source_files = "Common/cpp/worklets/**/*.{cpp,h}"
    ss.public_header_files = "Common/cpp/worklets/**/*.h"
    ss.header_mappings_dir = "Common/cpp/worklets"
  end

  s.subspec "apple" do |ss|
    ss.source_files = "apple/worklets/**/*.{mm,h,m}"
    ss.public_header_files = "apple/worklets/**/*.h"
    ss.header_mappings_dir = "apple/worklets"
  end

  # Use install_modules_dependencies helper to install the dependencies.
  # See https://github.com/facebook/react-native/blob/c925872e72d2422be46670777bfa2111e13c9e4c/packages/react-native/scripts/cocoapods/new_architecture.rb#L71.
  install_modules_dependencies(s)

  s.dependency 'React-jsi'
  using_hermes = ENV['USE_HERMES'] == nil || ENV['USE_HERMES'] == '1'
  if using_hermes && !$worklets_config[:is_tvos_target]
    s.dependency 'React-hermes'
  end
  
  s.pod_target_xcconfig = {
    "USE_HEADERMAP" => "YES",
    "DEFINES_MODULE" => "YES",
    "HEADER_SEARCH_PATHS" => [
      '"$(PODS_TARGET_SRCROOT)/ReactCommon"',
      '"$(PODS_TARGET_SRCROOT)"',
      '"$(PODS_ROOT)/RCT-Folly"',
      '"$(PODS_ROOT)/boost"',
      '"$(PODS_ROOT)/boost-for-react-native"',
      '"$(PODS_ROOT)/DoubleConversion"',
      '"$(PODS_ROOT)/Headers/Private/React-Core"',
      '"$(PODS_ROOT)/Headers/Private/Yoga"',
    ].join(' '),
    "FRAMEWORK_SEARCH_PATHS" => '"${PODS_CONFIGURATION_BUILD_DIR}/React-hermes"',
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
    "GCC_PREPROCESSOR_DEFINITIONS[config=*Debug*]" => "$(inherited) #{hermes_debug_hidden_flags}",
    "GCC_PREPROCESSOR_DEFINITIONS[config=*Release*]" => "$(inherited)",
    "OTHER_CFLAGS" => "$(inherited) #{feature_flags} #{version_flags} #{worklets_profiling_flag} #{bundle_mode_flag} #{fetch_preview_flag} #{hermes_v1_flag}",
  }
  s.xcconfig = {
    "HEADER_SEARCH_PATHS" => [
      '"$(PODS_ROOT)/boost"',
      '"$(PODS_ROOT)/boost-for-react-native"',
      '"$(PODS_ROOT)/glog"',
      '"$(PODS_ROOT)/RCT-Folly"',
      '"$(PODS_ROOT)/Headers/Public/React-hermes"',
      '"$(PODS_ROOT)/Headers/Public/hermes-engine"',
      "\"$(PODS_ROOT)/#{$worklets_config[:react_native_common_dir]}\"",

    ].join(' '),
  }
  
end
