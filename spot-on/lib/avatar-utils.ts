const AVATARS = [
    "/avatar1.svg",
    "/avatar2.svg",
    "/avatar3.svg",
    "/avatar4.svg",
    "/avatar5.svg",
    "/avatar6.svg",
    "/avatar7.svg",
    "/avatar8.svg",
];

/**
 * Returns a deterministic avatar SVG path for a given email.
 * Calculated once at login and stored in user.image in the DB.
 */
export function getAvatarForUser(email: string): string {
    const localPart = email.trim().split("@")[0].slice(1);
    const parsed = Number.parseInt(localPart, 10);
    const i = Number.isNaN(parsed)
        ? email.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
        : parsed;
    return AVATARS[i % AVATARS.length];
}
