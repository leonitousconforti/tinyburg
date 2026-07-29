import { Effect, Context, Layer } from "effect";

export class OIDCRepository extends Context.Service<OIDCRepository>()("@tinyburg/tinyburg.app/domain/OIDCRepository", {
    make: Effect.gen(function* () {
        return {};
    }),
}) {
    static readonly Default = Layer.effect(this, OIDCRepository.make);
}
