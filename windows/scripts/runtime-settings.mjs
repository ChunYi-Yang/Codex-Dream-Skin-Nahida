import fs from "node:fs";
import path from "node:path";

export function readSavedRuntimeState(stateRoot) {
  try {
    return JSON.parse(fs.readFileSync(path.win32.join(stateRoot, "state.json"), "utf8").replace(/^\uFEFF/, ""));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw new Error("Saved runtime settings are unreadable; preserve the state file and repair it before launching.");
  }
}

export function resolveRuntimeSettings({ stateRoot, savedState = null, explicitProfile = null, explicitPort = null, existsSync = fs.existsSync }) {
  if (typeof stateRoot !== "string" || !path.win32.isAbsolute(stateRoot)) throw new Error("State root must be absolute.");
  const root = path.win32.normalize(stateRoot);
  const savedProfile = savedState?.profilePath;
  let profilePath;
  if (explicitProfile) {
    if (typeof explicitProfile !== "string" || !path.win32.isAbsolute(explicitProfile)) throw new Error("Explicit profile must be absolute.");
    profilePath = path.win32.normalize(explicitProfile);
  } else if (savedProfile) {
    if (typeof savedProfile !== "string" || !path.win32.isAbsolute(savedProfile)) throw new Error("Saved profile must be absolute and inside the state root.");
    profilePath = path.win32.normalize(savedProfile);
    const relative = path.win32.relative(root, profilePath);
    if (!relative || relative === ".." || relative.startsWith("..\\") || path.win32.isAbsolute(relative)) {
      throw new Error("Saved profile must remain inside the state root.");
    }
  } else {
    const legacy = path.win32.join(root, "Profile-v3");
    profilePath = existsSync(legacy) ? legacy : path.win32.join(root, "cdp-profile");
  }
  const port = explicitPort ?? savedState?.port ?? 9335;
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Runtime port must be an integer from 1024 to 65535.");
  return { profilePath, port };
}
