import type { APIContext } from "astro";

import { Context } from "effect";

export class AstroContext extends Context.Tag("AstroContext")<AstroContext, APIContext>() {}
