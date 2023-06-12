rush deploy --project @tinyburg/authproxy --create-archive /workspaces/tinyburg/apps/authproxy/deploy.zip --create-archive-only
docker build -t tinyburg/authproxy:latest .
