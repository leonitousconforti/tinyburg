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
        { pkgs, system, ... }:
        let
          nodejs = pkgs.nodejs-slim_latest;
          corepack = pkgs.corepack.override { nodejs-slim = nodejs; };
          tools = with pkgs; [
            nixd
            nixfmt
            nodejs
            corepack
            python3
            process-compose
          ];

          # Google's Android SDK is unfree and needs its license accepted. This
          # nixpkgs instance builds nothing but the SDK, so nothing else in the
          # flake becomes unfree.
          androidPkgs = import inputs.nixpkgs {
            inherit system;
            config = {
              allowUnfree = true;
              android_sdk.accept_license = true;
            };
          };

          # For insight: the emulator and a rootable (Google APIs, not Play
          # Store) Android 16 image in both ABIs. TinyTower ships only ARM
          # libraries, which an x86_64 image runs through Android's ARM
          # translation and an arm64 image runs natively (fully emulated on an
          # x86_64 host). Android 14's translator lacks instructions the game
          # uses and kills it within seconds; Android 16's runs it.
          android = androidPkgs.androidenv.composeAndroidPackages {
            platformVersions = [ "36" ];
            buildToolsVersions = [ ];
            includeCmake = false;
            includeEmulator = true;
            includeSystemImages = true;
            systemImageTypes = [ "google_apis" ];
            abiVersions = [
              "x86_64"
              "arm64-v8a"
            ];
          };
          androidHome = "${android.androidsdk}/libexec/android-sdk";
        in
        {
          formatter = pkgs.alejandra;

          devShells.default = pkgs.mkShell {
            packages = tools;
          };

          # `nix develop .#android`: the default tools plus the Android SDK.
          # frida-tools finds adb and the emulator through ANDROID_HOME.
          devShells.android = pkgs.mkShell {
            packages = tools ++ [ android.androidsdk ];
            ANDROID_HOME = androidHome;
            ANDROID_SDK_ROOT = androidHome;
          };
        };
    };
}
