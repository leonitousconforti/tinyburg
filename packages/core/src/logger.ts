/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */

import Debug from "debug";
import { format } from "node:util";

// Modified from https://github.com/pinojs/pino/blob/5e316786be3f1a685ec0aad73f743f82246f2ba4/pino.d.ts#L276-L282
export interface ILogFunction {
    (message: string, ...arguments_: unknown[]): void;
    (object: unknown, message?: string, ...arguments_: unknown[]): void;
}
export interface ILogAndThrowFunction {
    (error: Error, ...arguments_: unknown[]): Promise<never>;
    (object: object, error: Error, ...arguments_: unknown[]): Promise<never>;
}

// Modified from https://github.com/pinojs/pino/blob/5e316786be3f1a685ec0aad73f743f82246f2ba4/pino.d.ts#L111-L193
export interface ILogger {
    fatal: ILogAndThrowFunction;
    error: ILogFunction;
    warn: ILogFunction;
    info: ILogFunction;
    debug: ILogFunction;
    trace: ILogFunction;
}

// No-operation logger
export class NoopLogger implements ILogger {
    public fatal: ILogAndThrowFunction = (object: unknown, error: unknown) => {
        return object instanceof Error ? Promise.reject(object) : Promise.reject(error);
    };

    public error: ILogFunction = (obj: unknown, ...args: unknown[]) => {};
    public warn: ILogFunction = (obj: unknown, ...args: unknown[]) => {};
    public info: ILogFunction = (obj: unknown, ...args: unknown[]) => {};
    public debug: ILogFunction = (obj: unknown, ...args: unknown[]) => {};
    public trace: ILogFunction = (obj: unknown, ...args: unknown[]) => {};
}

// Logger class to store messages from all modules
export class ArrayLogger implements ILogger {
    private readonly _messages: string[];

    public constructor() {
        this._messages = [];
    }

    public get messages(): string[] {
        return this._messages;
    }

    #log = (object: unknown, ...args: unknown[]): void => {
        if (typeof object === "object") {
            this._messages.push(format(args.shift() || "", ...args));
        } else {
            this._messages.push(format(object, ...args));
        }
    };

    public fatal: ILogAndThrowFunction = (object: unknown, error: unknown) => {
        if (object instanceof Error) {
            this._messages.push(object.message);
            return Promise.reject(object);
        } else {
            this._messages.push((error as Error).message);
            return Promise.reject(error as Error);
        }
    };
    public error: ILogFunction = (object: unknown, ...args: unknown[]) => this.#log(object, ...args);
    public warn: ILogFunction = (object: unknown, ...args: unknown[]) => this.#log(object, ...args);
    public info: ILogFunction = (object: unknown, ...args: unknown[]) => this.#log(object, ...args);
    public debug: ILogFunction = (object: unknown, ...args: unknown[]) => this.#log(object, ...args);
    public trace: ILogFunction = (object: unknown, ...args: unknown[]) => this.#log(object, ...args);
}

// Simple logger implemented with Debug
export class DebugLogger implements ILogger {
    private readonly _debugInstance: Debug.Debugger;

    public constructor(namespace: string) {
        this._debugInstance = Debug(namespace);
    }

    private _log(object: unknown, ...args: unknown[]): void {
        if (typeof object === "object") {
            this._debugInstance(args.shift() || "", ...(args || []));
        } else {
            this._debugInstance(object, ...args);
        }
    }

    public fatal: ILogAndThrowFunction = (object: unknown, error: unknown) => {
        if (object instanceof Error) {
            this._debugInstance(object.message);
            return Promise.reject(object);
        } else {
            this._debugInstance((error as Error).message);
            return Promise.reject(error as Error);
        }
    };
    public error: ILogFunction = (object: unknown, ...args: unknown[]) => this._log(object, ...args);
    public warn: ILogFunction = (object: unknown, ...args: unknown[]) => this._log(object, ...args);
    public info: ILogFunction = (object: unknown, ...args: unknown[]) => this._log(object, ...args);
    public debug: ILogFunction = (object: unknown, ...args: unknown[]) => this._log(object, ...args);
    public trace: ILogFunction = (object: unknown, ...args: unknown[]) => this._log(object, ...args);
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import type { Logger as _PinoLogger, pino as Pino } from "pino";

let pino: Pino;
try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    pino = await import("pino");
    // eslint-disable-next-line no-empty
} catch {}

// Logger implemented with Pino
export class PinoLogger implements ILogger {
    private readonly _pino: Pino;

    public constructor(pinoInstance: _PinoLogger) {
        this._pino = pinoInstance || pino();
    }

    public fatal: ILogAndThrowFunction = (object: unknown, ...args: unknown[]) => {
        this._pino.error(object, ...args);
        return object instanceof Error ? Promise.reject(object) : Promise.reject(args.shift());
    };
    public error: ILogFunction = (object: unknown, ...args: unknown[]) => this._pino.error(object, ...args);
    public warn: ILogFunction = (object: unknown, ...args: unknown[]) => this._pino.warn(object, ...args);
    public info: ILogFunction = (object: unknown, ...args: unknown[]) => this._pino.info(object, ...args);
    public debug: ILogFunction = (object: unknown, ...args: unknown[]) => this._pino.debug(object, ...args);
    public trace: ILogFunction = (object: unknown, ...args: unknown[]) => this._pino.trace(object, ...args);
}
