/**
 * Generates the development signing key for tinyburg.app's OIDC provider.
 *
 * `OIDC_PRIVATE_JWK` has no default and the provider will not boot without it,
 * but a key committed to the repository is a key that ends up somewhere it
 * should not, so one is generated per checkout into `.dev/` and gitignored.
 * Existing keys are left alone: regenerating would invalidate every token and
 * session already minted against the local database.
 */

import { access, mkdir, writeFile } from "node:fs/promises";

const OUT = ".dev/oidc.jwk";

try {
    await access(OUT);
    console.log(`${OUT} already exists, leaving it alone`);
    process.exit(0);
} catch {
    // Falls through to generation
}

// ES256 rather than RS256: same support in effect-oidc, much smaller key, and
// nothing here is verifying against a fixed production algorithm.
const { privateKey } = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
]);

const jwk = await crypto.subtle.exportKey("jwk", privateKey);

// `ext` is a WebCrypto export detail rather than a JWK registered parameter.
delete jwk.ext;

await mkdir(".dev", { recursive: true });
await writeFile(OUT, JSON.stringify({ ...jwk, alg: "ES256", kid: "dev" }), { mode: 0o600 });

console.log(`wrote a fresh development signing key to ${OUT}`);
