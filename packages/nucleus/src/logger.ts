/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/naming-convention */

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

    public error: ILogFunction = (_object: unknown, ..._arguments_: unknown[]) => {};
    public warn: ILogFunction = (_object: unknown, ..._arguments_: unknown[]) => {};
    public info: ILogFunction = (_object: unknown, ..._arguments_: unknown[]) => {};
    public debug: ILogFunction = (_object: unknown, ..._arguments_: unknown[]) => {};
    public trace: ILogFunction = (_object: unknown, ..._arguments_: unknown[]) => {};
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

    private log = (object: unknown, ...arguments_: unknown[]): void => {
        if (typeof object === "object") {
            this._messages.push(format(arguments_.shift() || "", ...arguments_));
        } else {
            this._messages.push(format(object, ...arguments_));
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
    public error: ILogFunction = (object: unknown, ...arguments_: unknown[]) => this.log(object, ...arguments_);
    public warn: ILogFunction = (object: unknown, ...arguments_: unknown[]) => this.log(object, ...arguments_);
    public info: ILogFunction = (object: unknown, ...arguments_: unknown[]) => this.log(object, ...arguments_);
    public debug: ILogFunction = (object: unknown, ...arguments_: unknown[]) => this.log(object, ...arguments_);
    public trace: ILogFunction = (object: unknown, ...arguments_: unknown[]) => this.log(object, ...arguments_);
}

// Simple logger implemented with Debug
export class DebugLogger implements ILogger {
    private readonly _debugInstance: Debug.Debugger;

    public constructor(namespace: string) {
        this._debugInstance = Debug(namespace);
    }

    private _log(object: unknown, ...arguments_: unknown[]): void {
        if (typeof object === "object") {
            this._debugInstance(arguments_.shift() || "", ...(arguments_ || []));
        } else {
            this._debugInstance(object, ...arguments_);
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
    public error: ILogFunction = (object: unknown, ...arguments_: unknown[]) => this._log(object, ...arguments_);
    public warn: ILogFunction = (object: unknown, ...arguments_: unknown[]) => this._log(object, ...arguments_);
    public info: ILogFunction = (object: unknown, ...arguments_: unknown[]) => this._log(object, ...arguments_);
    public debug: ILogFunction = (object: unknown, ...arguments_: unknown[]) => this._log(object, ...arguments_);
    public trace: ILogFunction = (object: unknown, ...arguments_: unknown[]) => this._log(object, ...arguments_);
}
