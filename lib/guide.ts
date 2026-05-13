import { promises as fs } from "fs";
import path from "path";

export type Guide = {
  styles: string;
  body: string;
};

let cached: Guide | null = null;

export async function loadGuide(): Promise<Guide> {
  if (cached) return cached;

  const file = path.join(process.cwd(), "content", "guide.html");
  const html = await fs.readFile(file, "utf8");

  const styles = Array.from(html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi))
    .map((m) => m[1])
    .join("\n");

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const rawBody = bodyMatch ? bodyMatch[1] : "";

  // Strip inline <script> tags from the body — Mermaid init is handled in the client component.
  const body = rawBody.replace(/<script[\s\S]*?<\/script>/gi, "");

  cached = { styles, body };
  return cached;
}
