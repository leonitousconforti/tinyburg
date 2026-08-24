# @tinyburg/doorman-clone

The doorman. Every friend who visits your tower leaves a bitizen at the door;
this hands it straight back to them and then clears the visit.

It returns the bitizen exactly as it arrived. Improving it on the way out is
[`@tinyburg/auto-gold-bits`](../auto-gold-bits), which maxes the skills of
bitizens sent as gifts; the two are separate bots because they answer two
different queues (`get_visits` and `get_gifts`) and mean two different things.

Not to be confused with [`@tinyburg/doorman`](../../packages/doorman), which
drives the game itself - elevator rides, restocking, building.

## Self hosting

You need an api key with at least the `social_getVisits`, `social_sendItem` and
`social_receiveGift` scopes
