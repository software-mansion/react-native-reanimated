require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name = 'WithExpoModule'
  s.version = package['version']
  s.summary = package['description']
  s.license = package['license']
  s.homepage = package['homepage']
  s.author = 'Worklets integration examples'
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.source = { :path => '.' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  s.dependency 'ExpoModulesWorklets'

  s.source_files = '**/*.swift'
end
