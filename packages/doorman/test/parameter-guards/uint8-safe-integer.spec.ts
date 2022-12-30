import { uint8safeIntegerGuard } from "../../src/parameter-guards/uint8-safe-integer.js";

describe("Should check if a number is a valid uint8 integer", () => {
    it("Should throw when number is outside the range of [0, 255]", () => {
        expect(() => uint8safeIntegerGuard(-1)).to.throw(/Input must be greater than or equal to 0/);
        expect(() => uint8safeIntegerGuard(256)).to.throw(/Input must be less than 256/);
        expect(() => uint8safeIntegerGuard(Number.MAX_SAFE_INTEGER)).to.throw(/Input must be less than 256/);
    });

    it("Should throw when number is not a safe integer", () => {
        expect(() => uint8safeIntegerGuard(Number.POSITIVE_INFINITY)).to.throw(/Input is not a safe integer/);
        expect(() => uint8safeIntegerGuard(Number.NEGATIVE_INFINITY)).to.throw(/Input is not a safe integer/);
        expect(() => uint8safeIntegerGuard(Number.MAX_VALUE)).to.throw(/Input is not a safe integer/);
    });

    it("Should not throw with uint8 number", () => {
        expect(() => uint8safeIntegerGuard(127)).to.not.throw();
    });
});
