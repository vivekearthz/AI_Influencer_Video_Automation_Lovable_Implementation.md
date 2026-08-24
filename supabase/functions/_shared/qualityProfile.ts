// Quality profile → resolution mapping (spec §23).
export function qualityProfileResolution(profile: string): "720p" | "1080p" | "4k" {
  switch (profile) {
    case "premium":
      return "1080p";
    case "balanced":
      return "1080p";
    default:
      return "720p";
  }
}

export function qualityProfileMaxRetries(profile: string): number {
  switch (profile) {
    case "premium":
      return 3;
    case "balanced":
      return 2;
    default:
      return 1;
  }
}
