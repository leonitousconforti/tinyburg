{ inputs, ... }: {
  perSystem =
    {
      pkgs,
      lib,
      ...
    }:
    {
      process-compose."dev" =
        { config, ... }:
        let
          nodejs = pkgs.nodejs-slim_latest;
          seaweed = config.services.seaweedfs.seaweedfs;
          corepack = pkgs.corepack.override { nodejs-slim = nodejs; };

          ports = {
            tinyburgApp = 3000;
            authproxy = 3001;
            socialCircles = 3002;
            discordBot = 3003;
          };

          namespaces = {
            apps = "1-apps";
            workers = "2-workers";
            setup = "3-setup";
            infra = "4-infra";
          };

          archiveBucket = "tinyburg";
          archiveAccessKey = "tinyburg-local";
          archiveSecretKey = "tinyburg-local-secret";

          databases = {
            tinyburg-app = {
              port = 54320;
              name = "tinyburg_app";
            };
            authproxy = {
              port = 54321;
              name = "authproxy";
            };
            social-circles = {
              port = 54322;
              name = "social_circles";
            };
            discord-bot = {
              port = 54323;
              name = "discord_bot";
            };
          };

          backendFor = service: "${service}-backend";
          postgresFor = service: "${service}-postgres";
          databaseUrl =
            service:
            "postgres://postgres@127.0.0.1:${toString databases.${service}.port}/${databases.${service}.name}";

          postgresNamespaces = lib.concatMapAttrs (
            service: _:
            let
              pg = postgresFor service;
            in
            {
              ${pg}.namespace = namespaces.infra;
              "${pg}-init".namespace = namespaces.infra;
            }
          ) databases;

          exports = lib.mapAttrsToList (name: value: "export ${name}=${lib.escapeShellArg value}");

          runNode =
            {
              entry,
              env ? { },
            }:
            ''
              export PATH=${
                lib.makeBinPath [
                  nodejs
                  corepack
                ]
              }:$PATH
              ${lib.concatStringsSep "\n" (exports env)}
              exec node --watch --watch-preserve-output ${entry}
            '';

          runVite = filter: ''
            export PATH=${
              lib.makeBinPath [
                nodejs
                corepack
              ]
            }:$PATH
            exec pnpm --filter ${filter} exec vite build --watch
          '';

          backend =
            {
              service,
              entry,
              port,
              env ? { },
              disabled ? false,
              depends_on ? { },
            }:
            {
              namespace = namespaces.apps;
              inherit disabled;
              command = runNode {
                inherit entry;
                env = {
                  DATABASE_URL = databaseUrl service;
                  PORT = toString port;
                  HOST = "127.0.0.1";
                }
                // env;
              };
              depends_on = {
                ${postgresFor service}.condition = "process_healthy";
              }
              // depends_on;
            };

          worker =
            {
              entry,
              env ? { },
              depends_on ? { },
            }:
            {
              namespace = namespaces.workers;
              disabled = true;
              inherit depends_on;
              command = runNode { inherit entry env; };
            };

          client = filter: {
            namespace = namespaces.apps;
            command = runVite filter;
          };
        in
        {
          imports = [ inputs.services-flake.processComposeModules.default ];
          cli.environment.PC_DISABLE_DOTENV = true;

          services.postgres = lib.mapAttrs' (
            service: db:
            lib.nameValuePair (postgresFor service) {
              enable = true;
              dataDir = "./.dev/postgres/${service}";
              listen_addresses = "127.0.0.1";
              port = db.port;
              superuser = "postgres";
              initialDatabases = [ { name = db.name; } ];
              extensions = extensions: [ extensions.pg_cron ];
              settings = {
                shared_preload_libraries = "pg_cron";
                "cron.database_name" = db.name;
              };
            }
          ) databases;

          services.seaweedfs.seaweedfs = {
            enable = true;
            dataDir = "./.dev/seaweedfs";
            host = "127.0.0.1";
            filer.enable = true;
            s3 = {
              enable = true;
              config = pkgs.writeText "seaweedfs-s3.json" (
                builtins.toJSON {
                  identities = [
                    {
                      name = "archivist";
                      credentials = [
                        {
                          accessKey = archiveAccessKey;
                          secretKey = archiveSecretKey;
                        }
                      ];
                      actions = [
                        "Admin"
                        "Read"
                        "Write"
                        "List"
                        "Tagging"
                      ];
                    }
                  ];
                }
              );
            };
          };

          settings.processes = postgresNamespaces // {
            seaweedfs.namespace = namespaces.infra;

            seaweedfs-bucket = {
              namespace = namespaces.infra;
              depends_on."seaweedfs".condition = "process_healthy";
              command = ''
                echo "s3.bucket.create -name ${archiveBucket}" \
                  | ${lib.getExe seaweed.package} shell \
                      -master=127.0.0.1:${toString seaweed.master.port}
              '';
            };

            tinyburg-app-client = client "@tinyburg/tinyburg.app";
            ${backendFor "tinyburg-app"} = backend {
              service = "tinyburg-app";
              entry = "apps/tinyburg.app/server/index.ts";
              port = ports.tinyburgApp;
              env = {
                NODE_ENV = "development";
                LOG_LEVEL = "Debug";
                SITE_URL = "http://localhost:${toString ports.tinyburgApp}";
                GOOGLE_REDIRECT_URI = "http://localhost:${toString ports.tinyburgApp}/auth/google/callback";
                DISCORD_REDIRECT_URI = "http://localhost:${toString ports.tinyburgApp}/auth/discord/callback";
                GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
                DISCORD_JWKS_URI = "https://discord.com/api/oauth2/keys";
              };
            };

            authproxy-client = client "@tinyburg/authproxy";
            ${backendFor "authproxy"} = backend {
              service = "authproxy";
              entry = "apps/authproxy/index.ts";
              port = ports.authproxy;
              env = {
                NODE_ENV = "development";
                TINYBURG_OAUTH_ISSUER = "http://localhost:${toString ports.tinyburgApp}";
                TINYBURG_OAUTH_REDIRECT_URI = "http://localhost:${toString ports.authproxy}/auth/callback";
              };
            };

            social-circles-client = client "@tinyburg/social-circles";
            ${backendFor "social-circles"} = backend {
              service = "social-circles";
              entry = "apps/social-circles/index.ts";
              port = ports.socialCircles;
            };

            ${backendFor "discord-bot"} = backend {
              service = "discord-bot";
              entry = "apps/discord-bot/index.ts";
              port = ports.discordBot;
              disabled = true;
              env = {
                NODE_ENV = "development";
                TINYBURG_ISSUER = "http://localhost:${toString ports.tinyburgApp}";
                TINYBURG_REDIRECT_URI = "http://localhost:${toString ports.discordBot}/discord/callback";
              };
            };

            auto-gold-bits = worker { entry = "apps/auto-gold-bits/index.ts"; };
            doorman-clone = worker { entry = "apps/doorman-clone/index.ts"; };
            archivist = worker {
              entry = "apps/archivist/index.ts";
              depends_on."seaweedfs-bucket".condition = "process_completed_successfully";
              env = {
                ARCHIVIST_S3_ENDPOINT = "http://127.0.0.1:${toString seaweed.s3.port}";
                ARCHIVIST_S3_FORCE_PATH_STYLE = "true";
                ARCHIVIST_SPACES_KEY = archiveAccessKey;
                ARCHIVIST_SPACES_SECRET = archiveSecretKey;
              };
            };
          };
        };
    };
}
