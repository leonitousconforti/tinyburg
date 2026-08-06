{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    process-compose-flake.url = "github:Platonic-Systems/process-compose-flake";
    services-flake.url = "github:juspay/services-flake";
  };
  outputs =
    inputs@{ flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      systems = inputs.nixpkgs.lib.systems.flakeExposed;

      imports = [
        inputs.process-compose-flake.flakeModule
        ./nix/dev.nix
      ];

      perSystem =
        { pkgs, ... }:
        let
          nodejs = pkgs.nodejs-slim_latest;
          corepack = pkgs.corepack.override { nodejs-slim = nodejs; };
        in
        {
          formatter = pkgs.alejandra;

          devShells.default = pkgs.mkShell {
            packages = with pkgs; [
              nixd
              nixfmt
              nodejs
              corepack
              python3
              process-compose
            ];
          };
        };
    };
}
