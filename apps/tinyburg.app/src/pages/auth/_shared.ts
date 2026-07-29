import { Encoding, Result, Schema, SchemaGetter } from "effect";

const JoseHeaderSchema = Schema.Struct({
    kid: Schema.String,
    typ: Schema.Literal("JWT"),
    alg: Schema.Literals([
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
        "none",
    ]),
});

const JwtBodySchema = Schema.StructWithRest(
    Schema.Struct({
        iss: Schema.String.pipe(Schema.annotate({ description: "Issuer" })),
        sub: Schema.String.pipe(Schema.annotate({ description: "Subject" })),
        aud: Schema.Union([Schema.String, Schema.Array(Schema.String)]).pipe(
            Schema.annotate({ description: "Audience" })
        ),
        exp: Schema.Number.pipe(Schema.annotate({ description: "Expiration Time" })),
        nbf: Schema.Number.pipe(Schema.annotate({ description: "Not Before" }), Schema.optional),
        iat: Schema.Number.pipe(Schema.annotate({ description: "Issued At" })),
        jti: Schema.String.pipe(Schema.annotate({ description: "JWT ID" }), Schema.optional),
    }),
    [Schema.Record(Schema.String, Schema.UndefinedOr(Schema.Unknown))]
);

const JwtSchema = Schema.TemplateLiteralParser([
    Schema.StringFromBase64Url.pipe(Schema.decodeTo(Schema.fromJsonString(JoseHeaderSchema))),
    ".",
    Schema.StringFromBase64Url.pipe(Schema.decodeTo(Schema.fromJsonString(JwtBodySchema))),
    ".",
    Schema.String,
]).pipe(
    Schema.decodeTo(JwtBodySchema, {
        encode: SchemaGetter.forbidden(() => "Encoding JWTs is not supported"),
        decode: SchemaGetter.transform(([_header, _period, body, __period, _signature]) => body),
    })
);

export const OAuthResponseSchema = Schema.Struct({
    access_token: Schema.String,
    expires_in: Schema.Int,
    refresh_token: Schema.optional(Schema.String),
    scope: Schema.String,
    token_type: Schema.String,
    id_token: JwtSchema,
});

export const SESSION_ID_COOKIE_NAME = "session_id";

const DEFAULT_DESTINATION = "/towers/@me";

/** Post-login destinations must be local absolute paths, never off-site. */
const sanitizeReturnTo = (returnTo: string | null): string | undefined =>
    returnTo !== null && returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("\\")
        ? returnTo
        : undefined;

/** Where to land after login: the sanitized returnTo, or the user's tower. */
export const postLoginDestination = (returnTo: string | null): string =>
    sanitizeReturnTo(returnTo) ?? DEFAULT_DESTINATION;

/**
 * The post-login destination rides inside the OAuth state parameter, which
 * already round-trips through the provider and is integrity-checked against
 * the state cookie. Base64url contains no ".", keeping the separator
 * unambiguous after the random hex prefix. Off-site destinations are dropped
 * here, so callers may pass the raw query parameter.
 */
export const stateWithReturnTo = (state: string, returnTo: string | null): string => {
    const destination = sanitizeReturnTo(returnTo);
    return destination === undefined ? state : `${state}.${Encoding.encodeBase64Url(destination)}`;
};

export const destinationFromState = (state: string): string => {
    const separator = state.indexOf(".");
    if (separator === -1) return DEFAULT_DESTINATION;
    const decoded = Encoding.decodeBase64UrlString(state.slice(separator + 1));
    return Result.isSuccess(decoded) ? postLoginDestination(decoded.success) : DEFAULT_DESTINATION;
};
