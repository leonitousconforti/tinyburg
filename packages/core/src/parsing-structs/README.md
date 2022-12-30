# Structs

Here lies the structures that define the parsing types for the [save-parser](../save-parser.ts).

-   `Common` is for things shared throughout all versions
-   `vX.Y.Z` represents a particular save version type. Most of the newer version will extend from the older versions, to eliminate the repetitive code

The files in this directory point to the most recent version, so that the files can just be changed to import a newer version when it comes out and you don't have to change a bunch of imports throughout the codebase.

## How does it work if I don't see the version I'm using here?

There are parsing structs for every minor version of the game supported, i.e 3.14, 3.15, 3.16, 4.0, and 4.1. Since patch versions like 3.14.2 don't change the structs at all from 3.14.0, we can just use the same structs as we would for 3.14.0 to parse a 3.14.2 save. The struct loader implements this module resolution algorithm to load the correct structs when your version does now show up as a folder here.
