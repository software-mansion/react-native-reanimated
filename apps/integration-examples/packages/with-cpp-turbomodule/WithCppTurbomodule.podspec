require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'WithCppTurbomodule'
  s.version = package['version']
  s.summary = package['description']
  s.license = package['license']
  s.homepage = package['homepage']
  s.author = 'Worklets integration examples'
  s.platforms = { :ios => min_ios_version_supported }
  s.source = { :path => '.' }
  s.source_files = 'cpp/**/*.{h,cpp}', 'ios/**/*.{h,mm}'
  s.pod_target_xcconfig = {
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
    'OTHER_CPLUSPLUSFLAGS' => '$(inherited) -DWORKLETS_STABLE_API_TARGET=\"0.14.0\"'
  }

  s.dependency 'RNWorklets'
  install_modules_dependencies(s)
end
