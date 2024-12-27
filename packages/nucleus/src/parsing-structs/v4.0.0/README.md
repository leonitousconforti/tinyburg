v4.0.0 documentation and save game parsing is in the works!

If you would like to contribute, the basic idea is I use the [bin/checkSavedataBlocks](../../../bin/checkSavedataBlocks.js) as well as the [bin/saveViewer](../../../bin/saveViewer.js) scripts to make sure that I am parsing all save data correctly. When I am confident I have identified all new blocks and repaired old ones, the structs will be published here

# Changes

### Additions

| Nimblebit block name | name on json save |     purpose     |
| :------------------: | :---------------: | :-------------: |
|         Pex          |        ex         |     idk yet     |
|         PAir         |        air        |     airport     |
|        PHouse        |       house       |  player house   |
|        Pmhst         |    missionHist    | mission history |

### Updates

| Nimblebit block name | name on json save |                   purpose                   |
| :------------------: | :---------------: | :-----------------------------------------: |
|        Pmiss         |      mission      | mission now includes the bitizen to display |

### Removals

none
