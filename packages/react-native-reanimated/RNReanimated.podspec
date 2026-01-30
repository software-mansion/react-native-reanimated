require "json"
require_relative './scripts/reanimated_utils'

reanimated_package_json = JSON.parse(File.read(File.join(__dir__, "package.json")))
$config = find_config()
assert_minimal_react_native_version($config)

$new_arch_enabled = ENV['RCT_NEW_ARCH_ENABLED'] != '0'
assert_new_architecture_enabled($new_arch_enabled)

boost_compiler_flags = '-Wno-documentation'
example_flag = $config[:is_reanimated_example_app] ? '-DIS_REANIMATED_EXAMPLE_APP' : ''
reanimated_profiling_flag = ENV['IS_REANIMATED_PROFILING'] ? '-DREANIMATED_PROFILING' : ''
version_flags = "-DREACT_NATIVE_MINOR_VERSION=#{$config[:react_native_minor_version]} -DREANIMATED_VERSION=#{reanimated_package_json['version']}"
ios_min_version = '13.4'

# Directory in which data for further processing for clangd will be stored.
compilation_metadata_dir = "CompilationDatabase"
# We want generate the metadata only within the monorepo of Reanimated.
compilation_metadata_generation_flag = $config[:is_reanimated_example_app] ? "-gen-cdb-fragment-path #{compilation_metadata_dir}" : ''

feature_flags = "-DREANIMATED_FEATURE_FLAGS=\"#{get_static_feature_flags()}\""

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

  s.dependency "RNWorklets"

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

  s.pod_target_xcconfig = {
    "USE_HEADERMAP" => "YES",
    "DEFINES_MODULE" => "YES",
    "HEADER_SEARCH_PATHS" => [
      '$(inherited)',
      "\"$(PODS_ROOT)/#{$config[:react_native_common_dir]}\"",
      "\"$(PODS_ROOT)/#{$config[:dynamic_frameworks_reanimated_dir]}/apple\"",
      "\"$(PODS_ROOT)/#{$config[:dynamic_frameworks_reanimated_dir]}/Common/cpp\"",
      "\"$(PODS_ROOT)/#{$config[:dynamic_frameworks_reanimated_dir]}/Common/NativeView\"",
      "\"$(PODS_ROOT)/#{$config[:dynamic_frameworks_worklets_dir]}/apple\"",
      "\"$(PODS_ROOT)/#{$config[:dynamic_frameworks_worklets_dir]}/Common/cpp\"",
    ].join(' '),
    "FRAMEWORK_SEARCH_PATHS" => '"${PODS_CONFIGURATION_BUILD_DIR}/React-hermes"',
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
    "GCC_PREPROCESSOR_DEFINITIONS[config=*Debug*]" => '$(inherited)',
    "GCC_PREPROCESSOR_DEFINITIONS[config=*Release*]" => '$(inherited)',
    "OTHER_CFLAGS" => "$(inherited) #{example_flag} #{version_flags} #{compilation_metadata_generation_flag} #{feature_flags} #{reanimated_profiling_flag}",
  }
  s.compiler_flags = boost_compiler_flags
  s.requires_arc = true

  install_modules_dependencies(s)

  using_hermes = ENV['USE_HERMES'] == nil || ENV['USE_HERMES'] == '1'
  if using_hermes && !$config[:is_tvos_target]
    s.dependency 'React-hermes'
  end
end
