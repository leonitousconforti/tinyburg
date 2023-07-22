// eslint-disable-next-line @rushstack/typedef-var
export const ApkmirrorVersions = ["4.23.0", "4.23.1"] as const;

export type ApkmirrorVersion = (typeof ApkmirrorVersions)[number];
