import * as InternalSchemas from "@tinyburg/fount/internal/schemas";

// $ExpectType readonly ["com.nimblebit.bitcity", "com.nimblebit.tinytower", "com.nimblebit.legotower", "com.nimblebit.pocketfrogs", "com.nimblebit.pocketplanes", "com.nimblebit.pockettrains"]
const _ = InternalSchemas.Game.literals;
