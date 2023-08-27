// For when you just need to give up and quit

const checkTheLogsOf = (containerName: string): string => `please check the logs of container "${containerName}"`;

export const containerDiedPrematurely = (containerName: string): Error =>
    new Error(`Container died prematurely, ${checkTheLogsOf(containerName)}`);

export const execCommandInContainerFailed = (containerName: string, command: string[]): Error =>
    new Error(`Running command ${command.join("")} failed, ${checkTheLogsOf(containerName)}`);

export const timedOutWhileWaitingForContainerToBecomeHealthy = (containerName: string): Error =>
    new Error(`Timed out while waiting for container to become healthy, ${checkTheLogsOf(containerName)}`);

export const couldNotPopulateShareVolume = (containerName: string): Error =>
    new Error(`An error ocurred when populating the shared emulator data volume, ${checkTheLogsOf(containerName)}`);

export const apkInstallFailed = (containerName: string): Error =>
    new Error(`Failed to install APK, ${checkTheLogsOf(containerName)}`);
