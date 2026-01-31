/* eslint-disable @typescript-eslint/consistent-type-imports */

/// <reference types="astro/client" />

declare namespace App {
    interface Locals {
        account: import("effect/Option").Option<{
            user: import("./domain/model").User;
            session: import("./domain/model").Session;
        }>;
    }
}
