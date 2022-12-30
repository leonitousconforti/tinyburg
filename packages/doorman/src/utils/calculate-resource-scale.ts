export const calculateResourceScale = (width: number, height: number): number => {
    const minimum = Math.min(width, height);
    const scale = minimum / 160;

    let clamped = Math.min(Math.max(1, Math.floor(scale)), 8);
    if (clamped > 4 && clamped % 2 !== 0) {
        clamped -= 1;
    }

    return clamped;
};
