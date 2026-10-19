import strings from "../../../content/ui/en.json" with { type: "json" };

type Key = Exclude<keyof typeof strings, "$schema">;

/** A UI string from content/ui/en.json; a missing key fails the type check. */
export const t = (key: Key): string => strings[key];
