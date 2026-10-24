import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MediaStorage } from ".";

// The turbopackIgnore comments keep the build from bundling the whole project
// into the server output, which it would otherwise do for paths only known at runtime.

/** Keeps files in a directory on this machine. */
export function diskStorage(dir: string): MediaStorage {
  const filePath = (filename: string) => path.join(/* turbopackIgnore: true */ dir, filename);

  return {
    async write(filename, data) {
      await mkdir(dir, { recursive: true });
      await writeFile(filePath(filename), data, { flag: "wx" });
    },
    async read(filename) {
      try {
        return await readFile(/* turbopackIgnore: true */ filePath(filename));
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw e;
      }
    },
    async remove(filename) {
      await rm(filePath(filename), { force: true });
    },
  };
}
