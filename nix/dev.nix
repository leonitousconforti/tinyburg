/*
  The local development stack.

  Datastores and services are one process-compose tree, so `dev` is the only
  command anyone has to know. Postgres comes from services-flake and keeps its
  state in `.dev/`, which means "start over" is `rm -rf .dev`, not a volume
  prune. The apps are plain `node --watch` processes rather than containers, so
  a save restarts the one service that changed and `r` in the process-compose
  TUI restarts whichever process is selected.

  There is no object storage here. Archivist is the only service that wants any,
  and it names the DigitalOcean Spaces endpoint inline, so a local MinIO would
  sit unreachable; nixpkgs also currently marks MinIO insecure. Making the
  endpoint a config with its present value as the default is what would earn it
  a place in this tree.

  Everything binds to 127.0.0.1 on non-default ports; a machine-wide Postgres
  on 5432 is left alone.
*/
{ inputs, ... }:
{
  perSystem =
    { pkgs, lib, ... }:
    {
      process-compose."dev" =
        { config, ... }:
        let
          nodejs = pkgs.nodejs-slim_latest;
          corepack = pkgs.corepack.override { nodejs-slim = nodejs; };

          ports = {
            postgres = 54320;
            tinyburgApp = 3000;
            authproxy = 3001;
            socialCircles = 3002;
            discordBot = 3003;
            heartbeat = 3999;
          };

          databaseUrl = dbName: "postgres://postgres@127.0.0.1:${toString ports.postgres}/${dbName}";

          # Seeded rather than generated, so the ids that have to appear in two
          # places at once (a row in one database, an env var read by another
          # service) are constants instead of something copy-pasted out of a
          # `RETURNING id` after every reset.
          authproxyClientId = "00000000-0000-4000-8000-000000000011";
          discordBotClientId = "00000000-0000-4000-8000-000000000012";

          # The bot is a confidential client, so unlike the authproxy it has a
          # secret to present at the token endpoint. Fixed and in the clear
          # here for the same reason `ADMIN_PASSWORD` below is: it authorizes
          # nothing outside this stack, and generating it would put it back in
          # the copy-paste-the-id business the seeded constants exist to end.
          discordBotClientSecret = "dev-only-discord-bot-client-secret";

          # A process is ready when it accepts a connection. The http services
          # have health routes, but a port check is uniform and does not care
          # what any one of them decided to call its endpoint.
          tcpReady = port: {
            exec.command = "${lib.getExe pkgs.bash} -c '</dev/tcp/127.0.0.1/${toString port}'";
            initial_delay_seconds = 2;
            period_seconds = 2;
            failure_threshold = 60;
          };

          exports = lib.mapAttrsToList (name: value: "export ${name}=${lib.escapeShellArg value}");

          /*
            Secrets come from `.env.dev` (gitignored, never in the nix store),
            structure comes from nix. The exports run after the sourcing so the
            wiring below always wins: `.env.dev` supplies provider credentials,
            not ports and connection strings.
          */
          runNode =
            {
              entry,
              env ? { },
              extra ? "",
            }:
            ''
              export PATH=${lib.makeBinPath [ nodejs corepack ]}:$PATH
              set -a
              [ -f .env.dev ] && . ./.env.dev
              set +a
              ${lib.concatStringsSep "\n" (exports env)}
              ${extra}
              exec node --watch --watch-preserve-output ${entry}
            '';

          # `vite build --watch` rather than a vite dev server, because both
          # SPAs are served out of `dist/client` by their own Effect server in
          # development exactly as in production. One origin, no proxy table.
          runVite = filter: ''
            export PATH=${lib.makeBinPath [ nodejs corepack ]}:$PATH
            exec pnpm --filter ${filter} exec vite build --watch
          '';
        in
        {
          imports = [ inputs.services-flake.processComposeModules.default ];

          services.postgres."pg" = {
            enable = true;
            dataDir = "./.dev/postgres";
            listen_addresses = "127.0.0.1";
            port = ports.postgres;
            superuser = "postgres";

            # One instance, one database per service. The services never join
            # across each other, so the only thing shared is the port.
            initialDatabases = [
              { name = "tinyburg_app"; }
              { name = "authproxy"; }
              { name = "social_circles"; }
              { name = "discord_bot"; }
            ];
          };

          settings.processes = {
            # The provider signs its tokens with a key that must not be a
            # committed constant even in development, so one is generated on
            # first run and kept out of git.
            dev-secrets = {
              namespace = "setup";
              command = ''
                export PATH=${lib.makeBinPath [ nodejs ]}:$PATH

                # `ConfigProvider.fromDotEnv()` reads `.env` from the working
                # directory and dies with ENOENT when there is not one. The file
                # is gitignored, so a fresh clone has never had it and an
                # existing checkout can lose it at any time. An empty one is
                # enough: the dev stack passes real configuration as environment
                # variables, and this only has to exist to be read.
                [ -f .env ] || : > .env

                exec node scripts/mkjwk.mjs
              '';
            };

            # Three services want somewhere to report liveness and refuse to
            # boot without it. Locally that is a sink that logs and returns 200.
            heartbeat-sink = {
              namespace = "infra";
              command = ''
                export PATH=${lib.makeBinPath [ nodejs ]}:$PATH
                export PORT=${toString ports.heartbeat}
                exec node scripts/heartbeat-sink.mjs
              '';
              readiness_probe = tcpReady ports.heartbeat;
            };

            tinyburg-app-client = {
              namespace = "apps";
              command = runVite "@tinyburg/tinyburg.app";
            };

            tinyburg-app = {
              namespace = "apps";
              command = runNode {
                entry = "apps/tinyburg.app/server/index.ts";
                env = {
                  DATABASE_URL = databaseUrl "tinyburg_app";
                  PORT = toString ports.tinyburgApp;
                  HOST = "127.0.0.1";
                  SITE_URL = "http://localhost:${toString ports.tinyburgApp}";
                  # Anything but `development` means Secure cookies and the
                  # `__Host-` prefix, which plain http cannot satisfy.
                  NODE_ENV = "development";
                  LOG_LEVEL = "Debug";
                  GOOGLE_REDIRECT_URI = "http://localhost:${toString ports.tinyburgApp}/auth/google/callback";
                  DISCORD_REDIRECT_URI = "http://localhost:${toString ports.tinyburgApp}/auth/discord/callback";
                  GOOGLE_JWKS_URI = "https://www.googleapis.com/oauth2/v3/certs";
                  DISCORD_JWKS_URI = "https://discord.com/api/oauth2/keys";
                };
                extra = ''export OIDC_PRIVATE_JWK="$(cat .dev/oidc.jwk)"'';
              };
              depends_on = {
                "pg".condition = "process_healthy";
                "dev-secrets".condition = "process_completed_successfully";
              };
              readiness_probe = tcpReady ports.tinyburgApp;
            };

            authproxy-client = {
              namespace = "apps";
              command = runVite "@tinyburg/authproxy";
            };

            authproxy = {
              namespace = "apps";
              command = runNode {
                entry = "apps/authproxy/index.ts";
                env = {
                  DATABASE_URL = databaseUrl "authproxy";
                  PORT = toString ports.authproxy;
                  HOST = "127.0.0.1";
                  NODE_ENV = "development";
                  ADMIN_USERNAME = "admin";
                  ADMIN_PASSWORD = "admin";
                  # The proxy is a relying party of the app next door, not of
                  # the deployed provider.
                  TINYBURG_ISSUER = "http://localhost:${toString ports.tinyburgApp}";
                  TINYBURG_CLIENT_ID = authproxyClientId;
                  TINYBURG_REDIRECT_URI = "http://localhost:${toString ports.authproxy}/auth/callback";
                };
              };
              depends_on = {
                "pg".condition = "process_healthy";
                "dev-secrets".condition = "process_completed_successfully";
              };
              readiness_probe = tcpReady ports.authproxy;
            };

            social-circles = {
              namespace = "apps";
              command = runNode {
                entry = "apps/social-circles/index.ts";
                env = {
                  DATABASE_URL = databaseUrl "social_circles";
                  PORT = toString ports.socialCircles;
                  HOST = "127.0.0.1";
                  HEARTBEAT_URL = "http://127.0.0.1:${toString ports.heartbeat}/social-circles";
                };
              };
              depends_on = {
                "pg".condition = "process_healthy";
                "dev-secrets".condition = "process_completed_successfully";
                "heartbeat-sink".condition = "process_healthy";
              };
              readiness_probe = tcpReady ports.socialCircles;
            };

            /*
              Off by default, and the only app here that is.

              Starting it opens a real gateway connection to Discord with a
              real bot token, which has to come from `.env.dev` as
              `DISCORD_BOT_TOKEN` and `DISCORD_APPLICATION_ID`; there is no
              local stand-in for Discord the way there is for the provider
              next door. dfx also syncs the global command list on connect, so
              a second instance sharing a token with a deployed bot will fight
              it over the commands and receive duplicate events.

              The OAuth half needs none of that. `discord_bot` exists whether
              or not this ever starts, and the callback route can be driven
              with curl once it does.
            */
            discord-bot = {
              namespace = "apps";
              disabled = true;
              command = runNode {
                entry = "apps/discord-bot/index.ts";
                env = {
                  DATABASE_URL = databaseUrl "discord_bot";
                  PORT = toString ports.discordBot;
                  HOST = "127.0.0.1";
                  # A relying party of the app next door, not of the deployed
                  # provider, exactly as the authproxy is.
                  TINYBURG_ISSUER = "http://localhost:${toString ports.tinyburgApp}";
                  TINYBURG_CLIENT_ID = discordBotClientId;
                  TINYBURG_CLIENT_SECRET = discordBotClientSecret;
                  TINYBURG_REDIRECT_URI = "http://localhost:${toString ports.discordBot}/discord/callback";
                };
              };
              depends_on = {
                "pg".condition = "process_healthy";
                "dev-secrets".condition = "process_completed_successfully";
              };
              readiness_probe = tcpReady ports.discordBot;
            };

            # Runs once the tables exist, which is on first boot of each
            # service, because every one of them runs its migrations as part of
            # its layer stack. Idempotent, so re-running it is free.
            seed = {
              namespace = "setup";
              command = ''
                export PATH=${lib.makeBinPath [ config.services.postgres.pg.package ]}:$PATH
                exec bash scripts/seed.sh
              '';
              environment = {
                PGHOST = "127.0.0.1";
                PGPORT = toString ports.postgres;
                PGUSER = "postgres";
                AUTHPROXY_CLIENT_ID = authproxyClientId;
                AUTHPROXY_REDIRECT_URI = "http://localhost:${toString ports.authproxy}/auth/callback";
                SITE_ORIGIN = "http://localhost:${toString ports.tinyburgApp}/";
                # Registered whether or not the bot is running: the row lives
                # in tinyburg_app, and seeding it only when the bot happens to
                # be started would make the seed non-deterministic.
                DISCORD_BOT_CLIENT_ID = discordBotClientId;
                DISCORD_BOT_CLIENT_SECRET = discordBotClientSecret;
                DISCORD_BOT_REDIRECT_URI = "http://localhost:${toString ports.discordBot}/discord/callback";
              };
              depends_on = {
                "tinyburg-app".condition = "process_healthy";
                "authproxy".condition = "process_healthy";
              };
            };

            /*
              The workers are one-shot scripts rather than servers, so they are
              off by default and started from the TUI when you want a run.

              Both of them build their client with
              `NimblebitAuth.layerTinyburgAuthProxyConfig`, whose host is the
              deployed proxy, so a run here reaches production. Pointing them
              at the local proxy is a swap to `layerCustomHostConfig`; until
              then, treat starting these as touching prod.
            */
            auto-gold-bits = {
              namespace = "workers";
              disabled = true;
              command = runNode {
                entry = "apps/auto-gold-bits/index.ts";
                env.HEARTBEAT_URL = "http://127.0.0.1:${toString ports.heartbeat}/auto-gold-bits";
              };
              depends_on."heartbeat-sink".condition = "process_healthy";
            };

            doorman-clone = {
              namespace = "workers";
              disabled = true;
              command = runNode {
                entry = "apps/doorman-clone/index.ts";
                env.HEARTBEAT_URL = "http://127.0.0.1:${toString ports.heartbeat}/doorman-clone";
              };
              depends_on."heartbeat-sink".condition = "process_healthy";
            };
          };
        };
    };
}
