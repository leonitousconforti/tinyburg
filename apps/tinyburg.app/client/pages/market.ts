import type { Offers } from "../backend.ts";
import type { MarketMessages, MarketPageMessages, SharedMessages, TradesMessages } from "../messages/types.ts";
import type { OpenOffer } from "@tinyburg/treasury-sdk/Sdk";
import type { Html, HtmlBuilder } from "foldkit/html";

import { type Language, longDate } from "@tinyburg/shared-ui/Internationalization";
import { AsyncData } from "foldkit";

import { appBackLink } from "../ui/chrome.ts";

type Offer = typeof OpenOffer.Type;
type ItemSpecValue = Offer["gives"];
type Kind = "bitizen" | "costume" | "pet" | "coins" | "bux";

/**
 * The two market pages, by what the offers on them give. Costumes and pets
 * share one: both are things a bitizen wears or keeps.
 */
export type Market = "bitizens" | "costumes";

const card = "bg-card-bg shadow-pixel-hover border-gold w-full rounded-2xl border-3 p-8";

const primaryButton =
    "font-pixel shadow-pixel hover:shadow-pixel-hover bg-sky-blue self-start rounded-lg border-2 border-sky-dark px-4 py-3 text-[0.6rem] text-white no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5";

/** What one side puts in. The gift channel only carries bitizens. */
const kindsOf = (spec: ItemSpecValue): ReadonlyArray<Kind> =>
    spec._tag === "GiftItem" ? ["bitizen"] : spec.items.map((entry) => entry.kind);

const belongsTo = (market: Market, offer: Offer): boolean =>
    kindsOf(offer.gives).some((kind) =>
        market === "bitizens" ? kind === "bitizen" : kind === "costume" || kind === "pet"
    );

/**
 * What one side puts in, for a reader: costumes and pets by name, currency by
 * amount. A bitizen's string carries its name only as indexes into the
 * game's name tables, so it reads as just a bitizen here.
 */
const describe = (msgs: TradesMessages, spec: ItemSpecValue): string =>
    spec._tag === "GiftItem"
        ? msgs.kinds.bitizen
        : spec.items
              .map((entry) =>
                  entry.kind === "coins" || entry.kind === "bux"
                      ? `${entry.amount ?? 0} ${msgs.kinds[entry.kind]}`
                      : entry.kind === "bitizen" || entry.item === undefined
                        ? msgs.kinds[entry.kind]
                        : `${msgs.kinds[entry.kind]} "${entry.item}"`
              )
              .join(", ");

/** One offer. Its page is the trade page, where a signed-in player accepts it. */
const offerCard =
    <M>(h: HtmlBuilder<M>, msgs: MarketMessages, trades: TradesMessages, language: Language) =>
    (offer: Offer): Html =>
        h.keyed("a")(
            offer.id,
            [
                h.Href(`/trades/${offer.id}`),
                h.Class(
                    "shadow-pixel hover:shadow-pixel-hover hover:border-sky-blue flex flex-wrap items-center gap-3 rounded-lg border-2 border-gray-300 bg-white px-4 py-3 no-underline transition-all hover:-translate-x-0.5 hover:-translate-y-0.5"
                ),
            ],
            [
                h.div(
                    [h.Class("min-w-0 flex-1")],
                    [
                        h.div(
                            [h.Class("flex flex-wrap items-center gap-2")],
                            [
                                h.span([h.Class("font-mono text-xl text-gray-800")], [describe(trades, offer.gives)]),
                                h.span(
                                    [
                                        h.Class(
                                            "font-pixel rounded border-2 border-gray-300 px-2 py-1 text-[0.5rem] text-gray-600"
                                        ),
                                    ],
                                    [trades.mechanisms[offer.mechanism]]
                                ),
                            ]
                        ),
                        h.div(
                            [h.Class("font-mono text-base text-gray-500")],
                            [trades.wants(describe(trades, offer.wants))]
                        ),
                        h.div(
                            [h.Class("font-mono text-base text-gray-500")],
                            [trades.expires(longDate(language, offer.expiresAt))]
                        ),
                    ]
                ),
                h.span([h.Class("font-pixel shrink-0 text-[0.6rem] text-gray-500")], [msgs.viewOffer]),
            ]
        );

/**
 * A market page: the open offers that give what the page is about, newest
 * first, and a way to make one. Public: the list needs no session, and the
 * trade pages it links to send a signed-out visitor to log in.
 */
export const marketView = <M>(
    h: HtmlBuilder<M>,
    market: Market,
    msgs: MarketMessages,
    trades: TradesMessages,
    shared: SharedMessages,
    language: Language,
    offers: Offers
): Html => {
    const page: MarketPageMessages = msgs[market];
    const status = (text: string, tone = "text-gray-600"): Html => h.p([h.Class(`font-mono text-xl ${tone}`)], [text]);
    const list = (all: ReadonlyArray<Offer>): Html => {
        const shown = all.filter((offer) => belongsTo(market, offer));
        return shown.length === 0
            ? status(page.empty)
            : h.div([h.Class("flex flex-col gap-4")], shown.map(offerCard(h, msgs, trades, language)));
    };

    return h.div(
        [h.Class("relative z-10 flex min-h-screen flex-col items-center p-8 pt-24")],
        [
            appBackLink(h, "/", shared.backToHome),
            h.div(
                [h.Class("flex w-full max-w-2xl flex-col gap-6")],
                [
                    h.h1([h.Class("font-pixel text-dark-blue text-lg")], [page.heading]),
                    h.p([h.Class("font-mono text-lg text-gray-600")], [page.tagline]),
                    h.section(
                        [h.Class(`${card} flex flex-col gap-6`)],
                        [
                            AsyncData.match(offers, {
                                onIdle: () => status(trades.loading),
                                onLoading: () => status(trades.loading),
                                onFailure: () => status(trades.loadFailed, "text-red-700"),
                                onRefreshing: list,
                                onStale: ({ data }) => list(data),
                                onSuccess: list,
                            }),
                            h.a([h.Href("/trades"), h.Class(primaryButton)], [msgs.makeOffer]),
                        ]
                    ),
                ]
            ),
        ]
    );
};
