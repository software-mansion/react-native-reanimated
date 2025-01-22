# -*- encoding: utf-8 -*-
# stub: connection_pool 2.5.0 ruby lib

Gem::Specification.new do |s|
  s.name = "connection_pool".freeze
  s.version = "2.5.0"

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.metadata = { "changelog_uri" => "https://github.com/mperham/connection_pool/blob/main/Changes.md", "rubygems_mfa_required" => "true" } if s.respond_to? :metadata=
  s.require_paths = ["lib".freeze]
  s.authors = ["Mike Perham".freeze, "Damian Janowski".freeze]
  s.date = "2025-01-07"
  s.description = "Generic connection pool for Ruby".freeze
  s.email = ["mperham@gmail.com".freeze, "damian@educabilia.com".freeze]
  s.homepage = "https://github.com/mperham/connection_pool".freeze
  s.licenses = ["MIT".freeze]
  s.required_ruby_version = Gem::Requirement.new(">= 2.5.0".freeze)
  s.rubygems_version = "3.1.6".freeze
  s.summary = "Generic connection pool for Ruby".freeze

  s.installed_by_version = "3.1.6" if s.respond_to? :installed_by_version

  if s.respond_to? :specification_version then
    s.specification_version = 4
  end

  if s.respond_to? :add_runtime_dependency then
    s.add_development_dependency(%q<bundler>.freeze, [">= 0"])
    s.add_development_dependency(%q<minitest>.freeze, [">= 5.0.0"])
    s.add_development_dependency(%q<rake>.freeze, [">= 0"])
  else
    s.add_dependency(%q<bundler>.freeze, [">= 0"])
    s.add_dependency(%q<minitest>.freeze, [">= 5.0.0"])
    s.add_dependency(%q<rake>.freeze, [">= 0"])
  end
end
