import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";

export async function makeTempDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", ["-y", ...args], { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    proc.on("error", (err) => reject(new Error(`Failed to start ffmpeg: ${err.message}. Is ffmpeg installed on PATH?`)));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited with code ${code}\n${stderr.slice(-4000)}`));
    });
  });
}

export async function downloadToFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(destPath, buffer);
}

/** Concatenate multiple 8-second scene clips into one raw master video. */
export async function concatScenes(sceneFiles: string[], outputPath: string, workDir: string): Promise<void> {
  if (sceneFiles.length === 1) {
    await fs.copyFile(sceneFiles[0], outputPath);
    return;
  }
  const listPath = path.join(workDir, "scenes.txt");
  const listContent = sceneFiles.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n");
  await fs.writeFile(listPath, listContent);
  await runFfmpeg(["-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outputPath]);
}

export interface BrandOverlayConfig {
  logoPath?: string;
  logoPosition?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  ctaText?: string;
  websiteText?: string;
  phoneText?: string;
}

const POSITION_EXPR: Record<string, string> = {
  "top-right": "W-w-32:32",
  "top-left": "32:32",
  "bottom-right": "W-w-32:H-h-32",
  "bottom-left": "32:H-h-32",
};

/** Overlay logo + burn CTA/website/phone text, re-encode to H.264 (spec §25-26). */
export async function applyBrandOverlay(input: string, output: string, config: BrandOverlayConfig): Promise<void> {
  const filters: string[] = [];
  const inputs = ["-i", input];

  let videoLabel = "0:v";

  if (config.logoPath) {
    inputs.push("-i", config.logoPath);
    const pos = POSITION_EXPR[config.logoPosition ?? "top-right"];
    filters.push(`[0:v][1:v]overlay=${pos}[withlogo]`);
    videoLabel = "withlogo";
  }

  const bottomTextParts = [config.ctaText, config.websiteText, config.phoneText].filter(Boolean);
  if (bottomTextParts.length) {
    const text = bottomTextParts.join("   |   ").replace(/:/g, "\\:").replace(/'/g, "\\'");
    filters.push(
      `[${videoLabel}]drawtext=text='${text}':fontcolor=white:fontsize=28:box=1:boxcolor=black@0.55:boxborderw=14:x=(w-text_w)/2:y=h-th-48[withtext]`
    );
    videoLabel = "withtext";
  }

  const args = [...inputs];
  if (filters.length) {
    args.push("-filter_complex", filters.join(";"), "-map", `[${videoLabel}]`, "-map", "0:a?");
  }
  args.push("-c:v", "libx264", "-preset", "medium", "-crf", "20", "-c:a", "aac", "-movflags", "+faststart", output);

  await runFfmpeg(args);
}

/** Burn subtitles into a copy of the video while keeping a clean master (spec §27). */
export async function burnSubtitles(input: string, srtPath: string, output: string): Promise<void> {
  const escapedSrt = srtPath.replace(/\\/g, "/").replace(/:/g, "\\:");
  await runFfmpeg([
    "-i",
    input,
    "-vf",
    `subtitles='${escapedSrt}':force_style='FontSize=20,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,BorderStyle=3'`,
    "-c:a",
    "copy",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "20",
    output,
  ]);
}
