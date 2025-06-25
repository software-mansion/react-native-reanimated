def add_clangd_generation_step()
  monorepo_root = File.expand_path('../../../..', __FILE__)
  print "Adding clangd generation step for Reanimated monorepo: #{monorepo_root}"

  generator_script_path = "#{monorepo_root}/scripts/clangd-generate-xcode-metadata.sh"

  script_phase :name => 'Generate metadata for clangd', :script => generator_script_path, :shell_path => '/bin/bash', :always_out_of_date => 'true', :execution_position => :after_compile
end
