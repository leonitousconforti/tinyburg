# @tinyburg/apks

an internal package that stores all versions of TinyTower that I want tinyburg to support, ready to be consumed by other tools such as @tinyburg/architect or @tinyburg/insight. There are downloaded apks from apkpure and apkmirror and they will never be uploaded to github because they are so large. I was going to get apks from gplaydl as well but the github issues recently seem to suggest that it is broken so I did not try it. This internal tool also supports patching the apks with frida-gadget and any mitm proxy certificates in case root is not available in the environment where TinyTower is going to be running or you want to analyze TinyTower web traffic.

## Future

thinking about also tracking major events and be able to load the versions for that event using this library too (like loading the version for the 2022 christmas event ect)
