export const insertIntoBlocks = function <
    T extends Record<string, unknown>,
    U extends keyof T,
    V extends Record<string, unknown>,
>(blocks: T, indexKey: U | undefined, newBlocks: V): T & V {
    const entries = Object.entries(blocks);
    const newBlocksEntries = Object.keys(newBlocks).map((k) => [k, newBlocks[k]])[0];

    if (indexKey) {
        const index = Object.keys(blocks).indexOf(indexKey as string);
        entries.splice(index, 0, newBlocksEntries as never);
    } else {
        entries.push(newBlocksEntries as never);
    }

    return Object.fromEntries(entries) as T & V;
};
