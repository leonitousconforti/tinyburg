// Helper definition to allow us to mutate a const type (such as the blocks) with new keys
export type Mutable<T> = { -readonly [P in keyof T]: T[P] };
