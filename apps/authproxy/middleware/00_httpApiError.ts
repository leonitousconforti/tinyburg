import { HttpApiError, HttpApiSchema, HttpLayerRouter, HttpMiddleware, HttpServerResponse } from "@effect/platform";
import { Effect, ParseResult, Schema } from "effect";

/** @internal */
const HttpApiErrorSchema = Schema.Union(
    HttpApiError.BadRequest,
    HttpApiError.Unauthorized,
    HttpApiError.Forbidden,
    HttpApiError.NotFound,
    HttpApiError.InternalServerError
);

/** @internal */
const responseSchema = Schema.declare(HttpServerResponse.isServerResponse);

/** @internal */
const toResponseError = <A, I, R>(
    schema: Schema.Schema<A, I, R>
): Schema.Schema<A, HttpServerResponse.HttpServerResponse, R> =>
    Schema.transformOrFail(responseSchema, schema, {
        decode: (_, __, ast) => ParseResult.fail(new ParseResult.Forbidden(ast, _, "Encode only schema")),
        encode: (data, _, ast) =>
            HttpServerResponse.json(data, {
                status: HttpApiSchema.getStatusErrorAST(ast.to),
            }).pipe(Effect.orDie),
    });

/**
 * Middleware to handle HttpApiError and convert them to proper HTTP responses.
 *
 * @since 1.0.0
 * @category Middleware
 */
export const HttpApiErrorMiddleware = HttpLayerRouter.middleware(
    Effect.gen(function* () {
        const schemas = new Set<Schema.Schema.AnyNoContext>();
        HttpApiSchema.deunionize(schemas, HttpApiErrorSchema);

        const encodeHttpApiError = Schema.encode(
            Schema.Union(...Array.from(schemas, toResponseError)) satisfies Schema.Schema<
                unknown,
                HttpServerResponse.HttpServerResponse
            >
        );

        return HttpMiddleware.make((httpAppMiddleware) =>
            Effect.catchIf(httpAppMiddleware, Schema.is(HttpApiErrorSchema), encodeHttpApiError)
        );
    })
);
