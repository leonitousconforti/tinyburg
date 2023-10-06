import type { FiniteStateMachine } from "./fsm.js";

export type Bitprint<States extends string | number | symbol, Data> = typeof FiniteStateMachine<States, Data>;
