require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'WithViewEvent'
  s.version = package['version']
  s.summary = package['description']
  s.license = package['license']
  s.homepage = package['homepage']
  s.author = 'Worklets integration examples'
  s.platforms = { :ios => min_ios_version_supported }
  s.source = { :path => '.' }
  s.source_files = 'ios/**/*.{h,mm}'

  install_modules_dependencies(s)
end
