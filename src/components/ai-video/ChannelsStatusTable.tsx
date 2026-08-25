import { ExternalLink, RotateCw } from "lucide-react";
import { StatusBadge } from "@/components/studio/StatusBadge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PublishJobWithAccount } from "@/hooks/useCampaigns";

export function ChannelsStatusTable({ jobs, onRetry }: { jobs: PublishJobWithAccount[]; onRetry: (jobId: string) => void }) {
  if (!jobs.length) {
    return <p className="text-sm text-muted-foreground">No publishing jobs yet — approve the campaign to queue them.</p>;
  }

  const published = jobs.filter((j) => j.status === "published").length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {published}/{jobs.length} channels complete
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Channel</TableHead>
            <TableHead>Publisher</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Link</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.id}>
              <TableCell className="font-medium">{job.social_accounts?.platform_key ?? "—"}</TableCell>
              <TableCell className="text-muted-foreground">{job.publisher_type}</TableCell>
              <TableCell><StatusBadge status={job.status} /></TableCell>
              <TableCell>
                {job.external_url ? (
                  <a href={job.external_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                    View <ExternalLink className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">{job.error_message ?? "—"}</span>
                )}
              </TableCell>
              <TableCell>
                {(job.status === "failed" || job.status === "blocked") && (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => onRetry(job.id)}>
                    <RotateCw className="h-3 w-3" /> Retry
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
