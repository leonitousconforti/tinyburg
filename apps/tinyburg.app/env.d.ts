// oxlint-disable typescript/consistent-type-imports

/// <reference types="astro/client" />

declare namespace App {
    interface Locals {
        account: import("effect/Option").Option<{
            user: import("./domain/models").User;
            session: import("./domain/models").Session;
        }>;
    }
}
