export const isValidGame = (game: string): boolean => {
    return ["TinyTower", "LegoTower", "TinyTowerVegas"].includes(game);
};
