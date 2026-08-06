/**
 * A single global pacer for everything that ultimately reaches Nimblebit.
 *
 * This is the constraint that shapes the whole crawl. Nimblebit's sync service
 * is somebody else's free infrastructure, and the study has no business
 * hammering it, so throughput is capped on purpose and every tower read queues
 * behind the same gate.
 *
 * It is also the reason the cluster runs as a single node: a distributed crawl
 * would need this bucket to be distributed too, which is real work in exchange
 * for parallelism the rate limit forbids us from using.
 */

import { Clock, Config, Context, Duration, Effect, Layer, Ref, Semaphore } from "effect";

export class NimblebitPacer extends Context.Service<NimblebitPacer>()(
    "@tinyburg/social-circles/services/NimblebitPacer",
    {
        make: Effect.gen(function* () {
            /**
             * Minimum gap between two calls. Conservative by default; the study
             * is never in a hurry and a slow crawl is strictly better than
             * getting the whole project blocked.
             */
            const spacing = yield* Config.int("NIMBLEBIT_MIN_INTERVAL_MILLIS").pipe(
                Config.withDefault(2_000),
                Config.map(Duration.millis)
            );

            // One permit, so callers serialise rather than all sleeping in
            // parallel and then firing at once the moment the interval passes.
            const gate = yield* Semaphore.make(1);
            const lastCallAt = yield* Ref.make(0);

            /**
             * Runs an effect no sooner than `spacing` after the previous one.
             *
             * The timestamp is recorded after the call completes, so a slow
             * request naturally spaces out the next one rather than letting a
             * backlog burst through behind it.
             */
            const paced = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> =>
                gate.withPermits(1)(
                    Effect.gen(function* () {
                        const last = yield* Ref.get(lastCallAt);
                        const now = yield* Clock.currentTimeMillis;
                        const elapsed = now - last;
                        const remaining = Duration.toMillis(spacing) - elapsed;
                        if (last !== 0 && remaining > 0) {
                            yield* Effect.sleep(Duration.millis(remaining));
                        }
                        return yield* Effect.ensuring(
                            effect,
                            Effect.flatMap(Clock.currentTimeMillis, (finished) => Ref.set(lastCallAt, finished))
                        );
                    })
                );

            return { paced };
        }),
    }
) {
    static readonly Default = Layer.effect(NimblebitPacer, NimblebitPacer.make);
}
