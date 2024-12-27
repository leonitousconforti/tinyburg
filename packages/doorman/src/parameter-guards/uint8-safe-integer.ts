import assert from "node:assert";

export const uint8safeIntegerGuard = (input: number): void => {
    assert(Number.isSafeInteger(input), "Input is not a safe integer");
    assert(input >= 0, "Input must be greater than or equal to 0");
    assert(input < 256, "Input must be less than 256");
};
