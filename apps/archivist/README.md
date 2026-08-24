# @tinyburg/archivist

Keeps a copy of every Nimblebit Android release. For each game it asks Google
Play what exists, downloads the APK and its split files, and puts them in
object storage under `archivist/<bundle-identifier>/<version-code>/<name>`.
