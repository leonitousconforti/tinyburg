import * as Effect from "effect/Effect";

import { GooglePlayApi } from "@efffrida/gplayapi";

const apks = Effect.provide(GooglePlayApi.download("com.nimblebit.tinytower"), GooglePlayApi.defaultHttpClient);
