import { migrateShape, type Project } from "./types";

export const isProject = (p: string) => p.toLowerCase().endsWith(".neatshot");

/** Blob/data URL → PNG-or-original data URL (blobs are same-origin, so fetch works). */
export async function toDataUrl(src: string): Promise<string> {
  if (!src || src.startsWith("data:")) return src;
  const blob = await (await fetch(src)).blob();
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(blob);
  });
}

/** Parse and validate a .neatshot file; throws an Error with a user-facing message. */
export function parseProject(text: string): Project {
  let j: Partial<Project>;
  try { j = JSON.parse(text); } catch { throw new Error("Not a valid NeatShotX project"); }
  if (j?.format !== "neatshot") throw new Error("Not a NeatShotX project file");
  if (j.version !== 1) throw new Error("This project was made by a newer NeatShotX");
  if (typeof j.base !== "string" || !j.base.startsWith("data:") || !Array.isArray(j.shapes)) throw new Error("Project file is damaged");
  return { ...(j as Project), original: typeof j.original === "string" && j.original ? j.original : j.base, shapes: j.shapes.map(migrateShape) };
}
