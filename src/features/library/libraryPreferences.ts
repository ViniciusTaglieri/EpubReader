export type LibraryThemePreference = "system" | "dark" | "light";
export type LibraryDensityPreference = "comfortable" | "compact";

export type LibraryPreferences = {
  theme: LibraryThemePreference;
  density: LibraryDensityPreference;
  wheelPageTurn: boolean;
};

export const DEFAULT_LIBRARY_PREFERENCES: LibraryPreferences = {
  theme: "dark",
  density: "comfortable",
  wheelPageTurn: true,
};

const LIBRARY_PREFERENCES_STORAGE_KEY = "epub-reader:library-preferences";

export function loadLibraryPreferences(): LibraryPreferences {
  try {
    const raw = window.localStorage.getItem(LIBRARY_PREFERENCES_STORAGE_KEY);
    if (!raw) return DEFAULT_LIBRARY_PREFERENCES;
    return normalizeLibraryPreferences(JSON.parse(raw));
  } catch {
    return DEFAULT_LIBRARY_PREFERENCES;
  }
}

export function saveLibraryPreferences(preferences: LibraryPreferences) {
  window.localStorage.setItem(
    LIBRARY_PREFERENCES_STORAGE_KEY,
    JSON.stringify(preferences),
  );
}

export function normalizeLibraryPreferences(
  input: Partial<LibraryPreferences>,
): LibraryPreferences {
  return {
    theme: oneOf(input.theme, ["system", "dark", "light"], DEFAULT_LIBRARY_PREFERENCES.theme),
    density: oneOf(
      input.density,
      ["comfortable", "compact"],
      DEFAULT_LIBRARY_PREFERENCES.density,
    ),
    wheelPageTurn:
      typeof input.wheelPageTurn === "boolean"
        ? input.wheelPageTurn
        : DEFAULT_LIBRARY_PREFERENCES.wheelPageTurn,
  };
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}
