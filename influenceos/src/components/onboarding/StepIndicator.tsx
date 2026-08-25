import { cn } from "@/lib/utils";

export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="mb-8 flex flex-wrap items-center gap-2 text-sm">
      {steps.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
              i === current ? "bg-primary text-primary-foreground" : i < current ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
            )}
          >
            {i + 1}
          </span>
          <span className={cn(i === current ? "font-medium" : "text-muted-foreground")}>{label}</span>
          {i < steps.length - 1 && <span className="mx-1 text-muted-foreground">→</span>}
        </li>
      ))}
    </ol>
  );
}
