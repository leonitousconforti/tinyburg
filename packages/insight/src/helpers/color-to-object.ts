// Converts an array of three numbers to an object like { r: 1, g: 2, b: 3 }.
export function colorToObject<
    T extends readonly [number, number, number] | [number, number, number],
    U extends { r: T[0]; g: T[1]; b: T[2] },
>(values: T): U {
    const keys = ["r", "g", "b"];
    return Object.fromEntries(keys.map((__key, index) => [keys[index], values[index]])) as U;
}
