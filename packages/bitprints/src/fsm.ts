import { DoublyLinkedList } from "./doubly-linked-list.js";

/** Transition grouping to facilitate fluent api. */
export class Transitions<State extends string | number | symbol, EventData> {
    public toStates: State[] = [];
    public fromStates: State[] = [];
    public readonly fsm: FiniteStateMachine<State, EventData>;

    public constructor(fsm: FiniteStateMachine<State, EventData>) {
        this.fsm = fsm;
    }

    /** Specify the end state(s) of a transition function. */
    public to(...states: State[]): void {
        this.toStates = states;
        this.fsm.addTransitions(this);
    }
}

/** Internal representation of a transition function */
export class TransitionFunction<State extends string | number | symbol, EventData> {
    public to: State;
    public from: State;
    public fsm: FiniteStateMachine<State, EventData>;

    public constructor(fsm: FiniteStateMachine<State, EventData>, from: State, to: State) {
        this.to = to;
        this.from = from;
        this.fsm = fsm;
    }
}

/**
 * A simple finite state machine implemented in TypeScript, the templated
 * argument is meant to be used with an enum.
 */
export class FiniteStateMachine<State extends string | number | symbol, EventData> {
    private _currentState: State;
    private _transitionFunctions: TransitionFunction<State, EventData>[];
    private _exitCallbacks: { [key in State]?: { (to: State, data: EventData): boolean }[] };
    private _enterCallbacks: { [key in State]?: { (from: State, data: EventData): boolean }[] };
    private _onCallbacks: {
        [key in State]?: DoublyLinkedList<{
            callback: (from: State, data: EventData) => Promise<EventData | void>;
            precedence: "Earlier" | "Later";
        }>;
    };

    public constructor(startState: State) {
        this._onCallbacks = {};
        this._exitCallbacks = {};
        this._enterCallbacks = {};
        this._transitionFunctions = [];
        this._currentState = startState;
    }

    public currentState(): State {
        return this._currentState;
    }

    public addTransitions(transitionFunction: Transitions<State, EventData>): void {
        for (const from of transitionFunction.fromStates) {
            for (const to of transitionFunction.toStates) {
                if (!this._canGo(from, to)) {
                    this._transitionFunctions.push(new TransitionFunction<State, EventData>(this, from, to));
                }
            }
        }
    }

    /** Listen for the transition to this state and fire the associated callback */
    public on(
        state: State,
        callback: (from: State, data: EventData) => Promise<EventData | void>,
        precedence: "Earlier" | "Later" = "Later"
    ): FiniteStateMachine<State, EventData> {
        if (!this._onCallbacks[state]) {
            this._onCallbacks[state] = DoublyLinkedList.from([]);
        }
        if (precedence === "Earlier") this._onCallbacks[state]!.prepend({ callback, precedence });
        else this._onCallbacks[state]!.append({ callback, precedence });
        this._onCallbacks[state]!.sort((a, b) => a.precedence !== b.precedence && a.precedence === "Earlier");
        return this;
    }

    /**
     * Listen for the transition to this state and fire the associated callback,
     * returning false in the callback will block the transition to this state.
     */
    public onEnter(
        state: State,
        callback: (from: State, data: EventData) => boolean
    ): FiniteStateMachine<State, EventData> {
        if (!this._enterCallbacks[state]) {
            this._enterCallbacks[state] = [];
        }
        this._enterCallbacks[state]!.push(callback);
        return this;
    }

    /**
     * Listen for the transition to this state and fire the associated callback,
     * returning false in the callback will block the transition from this
     * state.
     */
    public onExit(
        state: State,
        callback: (to: State, data: EventData) => boolean
    ): FiniteStateMachine<State, EventData> {
        if (!this._exitCallbacks[state]) {
            this._exitCallbacks[state] = [];
        }
        this._exitCallbacks[state]!.push(callback);
        return this;
    }

    /**
     * Declares the start state(s) of a transition function, must be followed
     * with a '.to(...endStates)'
     */
    public from(...states: State[]): Transitions<State, EventData> {
        const _transition = new Transitions<State, EventData>(this);
        _transition.fromStates = states;
        return _transition;
    }

    private _validTransition = (from: State, to: State): boolean =>
        this._transitionFunctions.some((tf) => tf.from === from && tf.to === to);

    /**
     * Check whether a transition between any two states is valid. If
     * allowImplicitSelfTransition is true, always allow transitions from a
     * state back to itself. Otherwise, check if it's a valid transition.
     */
    private _canGo = (fromState: State, toState: State): boolean =>
        fromState === toState || this._validTransition(fromState, toState);

    /** Check whether a transition to a new state is valid */
    public canGo = (state: State): boolean => this._canGo(this._currentState, state);

    /** Transition to another valid state */
    public async go(state: State, data: EventData): Promise<EventData | undefined> {
        if (this.canGo(state)) {
            return await this._transitionTo(state, data);
        } else {
            throw new Error(
                `No transition function exists from state ${String(this._currentState)} to ${String(state)}`
            );
        }
    }

    public async feed(data: EventData): Promise<EventData | undefined> {
        const possibleTransitions = this._transitionFunctions.filter(
            (transitionFunction) => transitionFunction.from === this._currentState
        );

        for (const possibleTransition of possibleTransitions) {
            const success = await this._transitionTo(possibleTransition.to, data);
            if (success) {
                return success;
            }
        }

        return;
    }

    /** Whether or not the current state equals the given state */
    public is = (state: State): boolean => this._currentState === state;

    private async _transitionTo(state: State, data: EventData): Promise<EventData | undefined> {
        if (!this._exitCallbacks[this._currentState]) {
            this._exitCallbacks[this._currentState] = [];
        }

        if (!this._enterCallbacks[state]) {
            this._enterCallbacks[state] = [];
        }

        if (!this._onCallbacks[state]) {
            this._onCallbacks[state] = DoublyLinkedList.from([]);
        }

        // eslint-disable-next-line unicorn/no-array-reduce
        const canExit: boolean = this._exitCallbacks[this._currentState]!.reduce(
            (accumulator, exitCallback) => accumulator && exitCallback.call(this, this._currentState, data),
            true
        );

        // eslint-disable-next-line unicorn/no-array-reduce
        const canEnter: boolean = this._enterCallbacks[state]!.reduce(
            (accumulator, enterCallback) => accumulator && enterCallback.call(this, state, data),
            true
        );

        if (canExit && canEnter) {
            const previousState = this._currentState;
            this._currentState = state;
            let newEventData = data;
            for (const { callback: onCallback } of this._onCallbacks[this._currentState]!) {
                const a = await onCallback.call(this, previousState, newEventData);
                if (a) {
                    newEventData = a;
                }
            }
            return newEventData;
        }

        return;
    }
}
