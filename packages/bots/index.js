export const burnerBots = {
    BPQSY: {
        player_id: "BPQSY",
        player_ss: "8dad81ae-2626-41b9-8225-325f4809057f",
    },
    "9GV59": {
        player_id: "9GV59",
        player_ss: "be61b26e-330b-41e0-ad2f-48eb79dc3bd6",
    },
    "9GV2Y": {
        player_id: "9GV2Y",
        player_ss: "efe5f6a3-8cd5-4956-897c-ec1db6c26485",
    },
    "9GTYN": {
        player_id: "9GTYN",
        player_ss: "89f9b90b-4e1e-4b48-af56-df39da7b17a7",
    },
};

export const getRandomBurnerBot = () => {
    const bots = Object.values(burnerBots);
    return bots[Math.floor(Math.random() * bots.length)];
};
