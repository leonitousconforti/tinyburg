import { Context } from "effect";

import type { APIContext } from "astro";

export class AstroContext extends Context.Service<AstroContext, APIContext>()("AstroContext") {}
