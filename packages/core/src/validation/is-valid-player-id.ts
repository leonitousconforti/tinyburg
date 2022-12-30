export const playerIdRegex = /^([\dA-Za-z]){1,5}$/gm;

// Validates a send to address, must be 1-5 characters long A-z 0-9
export const isValidPlayerId = (playerId: string): boolean => playerIdRegex.test(playerId);
