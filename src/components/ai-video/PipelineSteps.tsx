import { CheckCircle2, CircleDashed, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIGenerationJobRow, AIJobType } from "@/types/database";

const STEP_ORDER: { type: AIJobType; label: string }[] = [
  { type: "script", label: "Script" },
  { type: "presenter_image", label: "Presenter" },
  { type: "video", label: "Video generation" },
  { type: "voice", label: "Voice" },
  { type: "subtitle", label: "Subtitles" },
  { type: "render", label: "Rendering" },
  { type: "qc", label: "Quality check" },
  { type: "caption", label: "Captions" },
];

function StepIcon({ status }: { status?: string }) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-destructive" />;
  if (status === "processing" || status === "queued" || status === "retrying") return <Loader2 className="h-4 w-4 animate-spin text-warning" />;
  return <CircleDashed className="h-4 w-4 text-muted-foreground" />;
}

export function PipelineSteps({ jobs }: { jobs: AIGenerationJobRow[] }) {
  const latestByType = new Map<string, AIGenerationJobRow>();
  for (const job of jobs) {
    const existing = latestByType.get(job.job_type);
    if (!existing || new Date(job.created_at) > new Date(existing.created_at)) {
      latestByType.set(job.job_type, job);
    }
  }

  return (
    <ol className="space-y-2">
      {STEP_ORDER.map((step, idx) => {
        const job = latestByType.get(step.type);
        return (
          <li key={step.type} className="flex items-start gap-3 rounded-lg border border-border p-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
              {idx + 1}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <StepIcon status={job?.status} />
                <span className="text-sm font-medium">{step.label}</span>
                {job?.provider && <span className="text-xs text-muted-foreground">via {job.provider}{job.model ? ` · ${job.model}` : ""}</span>}
              </div>
              {job?.error_message && (
                <p className={cn("mt-1 text-xs text-destructive")}>Error: {job.error_message}</p>
              )}
              {job?.actual_cost != null && (
                <p className="mt-1 text-xs text-muted-foreground">Cost: ${job.actual_cost.toFixed ? job.actual_cost.toFixed(3) : job.actual_cost}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
