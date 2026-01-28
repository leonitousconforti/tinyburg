import { Effect, Encoding, ParseResult, Schema } from "effect";

const JoseHeaderSchema = Schema.Struct({
    kid: Schema.String,
    typ: Schema.Literal("JWT"),
    alg: Schema.Literal(
        "HS256",
        "HS384",
        "HS512",
        "RS256",
        "RS384",
        "RS512",
        "ES256",
        "ES384",
        "ES512",
        "PS256",
        "PS384",
        "PS512",
        "none"
    ),
});

const JwtBodySchema = Schema.Struct({
    iss: Schema.String.pipe(Schema.annotations({ description: "Issuer" })),
    sub: Schema.String.pipe(Schema.annotations({ description: "Subject" })),
    aud: Schema.Union(Schema.String, Schema.Array(Schema.String)).pipe(Schema.annotations({ description: "Audience" })),
    exp: Schema.Number.pipe(Schema.annotations({ description: "Expiration Time" })),
    nbf: Schema.Number.pipe(Schema.annotations({ description: "Not Before" }), Schema.optional),
    iat: Schema.Number.pipe(Schema.annotations({ description: "Issued At" })),
    jti: Schema.String.pipe(Schema.annotations({ description: "JWT ID" }), Schema.optional),
}).pipe(Schema.extend(Schema.Record({ key: Schema.String, value: Schema.UndefinedOr(Schema.Unknown) })));

const JwtSchema = Schema.transformOrFail(
    Schema.TemplateLiteralParser(
        Schema.compose(Schema.StringFromBase64Url, Schema.parseJson(JoseHeaderSchema)),
        ".",
        Schema.compose(Schema.StringFromBase64Url, Schema.parseJson(JwtBodySchema)),
        ".",
        Schema.String
    ),
    JwtBodySchema,
    {
        strict: true,
        encode: (input, _options, ast) =>
            ParseResult.fail(new ParseResult.Forbidden(ast, input, "Encoding JWTs is not supported")),
        decode: ([_header, _period, body, __period, _signature]) => {
            // TODO: verify the signature
            return ParseResult.succeed(body);
        },
    }
);

export const OAuthResponseSchema = Schema.Struct({
    access_token: Schema.String,
    expires_in: Schema.Number,
    refresh_token: Schema.optional(Schema.String),
    scope: Schema.String,
    token_type: Schema.String,
    id_token: JwtSchema,
});

export const randomStateGenerator = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");

export const Sha256CodeChallenge = (verifier: string) =>
    Effect.map(
        Effect.promise(() => crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))),
        (hashBuffer) => Encoding.encodeBase64Url(new Uint8Array(hashBuffer))
    );
