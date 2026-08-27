{
  description = "Reanimated layout-animation host harness";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";

  outputs = { nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = make:
        builtins.listToAttrs (map (system: {
          name = system;
          value = make system;
        }) systems);
      environmentFor = system:
        import ./harness/nix {
          pkgs = import nixpkgs { inherit system; };
          source = ./.;
        };
    in
    {
      packages = forAllSystems (system: (environmentFor system).packages);
      checks = forAllSystems (system: (environmentFor system).checks);
      apps = forAllSystems (system: (environmentFor system).apps);
      devShells = forAllSystems (system: { default = (environmentFor system).devShell; });
    };
}
