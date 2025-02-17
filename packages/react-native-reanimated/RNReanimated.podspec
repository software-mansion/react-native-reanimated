require "json"
require_relative './scripts/reanimated_utils'

reanimated_package_json = JSON.parse(File.read(File.join(__dir__, "package.json")))
$config = find_config()
assert_minimal_react_native_version($config)

$new_arch_enabled = ENV['RCT_NEW_ARCH_ENABLED'] == '1'
is_release = ENV['PRODUCTION'] == '1'

folly_flags = "-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1 -Wno-comma -Wno-shorten-64-to-32"
boost_compiler_flags = '-Wno-documentation'
fabric_flags = $new_arch_enabled ? '-DRCT_NEW_ARCH_ENABLED' : ''
example_flag = $config[:is_reanimated_example_app] ? '-DIS_REANIMATED_EXAMPLE_APP' : ''
version_flags = "-DREACT_NATIVE_MINOR_VERSION=#{$config[:react_native_minor_version]} -DREANIMATED_VERSION=#{reanimated_package_json['version']}"
debug_flag = is_release ? '-DNDEBUG' : ''
ios_min_version = '13.4'

# Directory in which data for further processing for clangd will be stored.
compilation_metadata_dir = "CompilationDatabase"
# We want generate the metadata only within the monorepo of Reanimated.
compilation_metadata_generation_flag = $config[:is_reanimated_example_app] ? "-gen-cdb-fragment-path #{compilation_metadata_dir}" : ''

Pod::Spec.new do |s|

  s.name         = "RNReanimated"
  s.version      = reanimated_package_json["version"]
  s.summary      = reanimated_package_json["description"]
  s.description  = <<-DESC
                  RNReanimated
                   DESC
  s.homepage     = "https://github.com/software-mansion/react-native-reanimated"
  s.license      = "MIT"
  s.author       = { "author" => "author@domain.cn" }
  s.platforms    = { :ios => ios_min_version, :tvos => "9.0", :osx => "10.14", :visionos => "1.0" }
  s.source       = { :git => "https://github.com/software-mansion/react-native-reanimated.git", :tag => "#{s.version}" }

  s.subspec "worklets" do |ss|
    ss.source_files = "Common/cpp/worklets/**/*.{cpp,h}"
    ss.header_dir = "worklets"
    ss.header_mappings_dir = "Common/cpp/worklets"

    ss.subspec "apple" do |sss|
      # Please be careful with the snakes.
      # 🐍🐍🐍
      # Thank you for your understanding.
      sss.source_files = "apple/worklets/**/*.{mm,h,m}"
      sss.header_dir = "worklets"
      sss.header_mappings_dir = "apple/worklets"
    end
  end

  s.subspec "reanimated" do |ss|
    ss.source_files = "Common/cpp/reanimated/**/*.{cpp,h}"
    ss.header_dir = "reanimated"
    ss.header_mappings_dir = "Common/cpp/reanimated"

    ss.subspec "apple" do |sss|
      sss.source_files = "apple/reanimated/**/*.{mm,h,m}"
      sss.header_dir = "reanimated"
      sss.header_mappings_dir = "apple/reanimated"
    end
  end

  gcc_debug_definitions = "$(inherited)"
  if !is_release
    gcc_debug_definitions << " HERMES_ENABLE_DEBUGGER=1"
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
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++17",
    "GCC_PREPROCESSOR_DEFINITIONS[config=Debug]" => gcc_debug_definitions,
    "GCC_PREPROCESSOR_DEFINITIONS[config=Release]" => '$(inherited) NDEBUG=1',
  }
  s.compiler_flags = "#{folly_flags} #{boost_compiler_flags}"
  s.xcconfig = {
    "HEADER_SEARCH_PATHS" => [
      '"$(PODS_ROOT)/boost"',
      '"$(PODS_ROOT)/boost-for-react-native"',
      '"$(PODS_ROOT)/glog"',
      '"$(PODS_ROOT)/RCT-Folly"',
      '"$(PODS_ROOT)/Headers/Public/React-hermes"',
      '"$(PODS_ROOT)/Headers/Public/hermes-engine"',
      "\"$(PODS_ROOT)/#{$config[:react_native_common_dir]}\"",
      "\"$(PODS_ROOT)/#{$config[:react_native_reanimated_dir_from_pods_root]}/apple\"",
      "\"$(PODS_ROOT)/#{$config[:react_native_reanimated_dir_from_pods_root]}/Common/cpp\"",
    ].join(' '),
    "OTHER_CFLAGS" => "$(inherited) #{folly_flags} #{fabric_flags} #{example_flag} #{version_flags} #{debug_flag} #{compilation_metadata_generation_flag}"
  }
  s.requires_arc = true

  install_modules_dependencies(s)

  s.dependency 'React-jsi'
  using_hermes = ENV['USE_HERMES'] == nil || ENV['USE_HERMES'] == '1'
  if using_hermes && !$config[:is_tvos_target]
    s.dependency 'React-hermes'
  end
end
