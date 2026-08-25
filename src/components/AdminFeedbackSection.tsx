import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pagination } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  EDITOR_BODY_TEXT_CLASS,
  EDITOR_TABLE_HEADER_CLASS,
  EDITOR_TABLE_SURFACE_CLASS,
  EmptySelectionState,
  SectionHeader,
} from "@/components/method-editor/MethodEditorPrimitives";
import {
  FEEDBACK_STATUSES,
  fetchAdminFeedback,
  fetchAdminFeedbackDetail,
  type FeedbackDetail,
  type FeedbackStatus,
  type FeedbackSummary,
  updateAdminFeedbackStatus,
} from "@/lib/feedback";
import { QUERY_STALE_TIME_MS } from "@/lib/queryRefresh";

const FEEDBACKS_PER_PAGE = 10;
const labels: Record<string, string> = {
  feature: "Feature",
  bug: "Bug",
  improvement: "Improvement",
  other: "Other",
  new: "New",
  considering: "Considering",
  planned: "Planned",
  completed: "Completed",
  rejected: "Rejected",
};
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function FeedbackDetailsDialog({
  feedbackId,
  onClose,
}: {
  feedbackId: string | null;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [draftStatus, setDraftStatus] = useState<FeedbackStatus | null>(null);
  const detailQuery = useQuery({
    queryKey: ["admin", "feedback", feedbackId],
    queryFn: () => fetchAdminFeedbackDetail(feedbackId ?? ""),
    enabled: feedbackId !== null,
    staleTime: QUERY_STALE_TIME_MS,
    retry: false,
  });
  const feedback = detailQuery.data;

  useEffect(() => {
    setDraftStatus(feedback?.status ?? null);
  }, [feedback?.id, feedback?.status]);

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: FeedbackStatus }) =>
      updateAdminFeedbackStatus(id, status),
    onSuccess: async (updatedFeedback) => {
      queryClient.setQueryData<FeedbackDetail>(
        ["admin", "feedback", updatedFeedback.id],
        updatedFeedback,
      );
      await queryClient.invalidateQueries({ queryKey: ["admin", "feedback-list"] });
      onClose();
    },
  });
  const hasStatusChanged = Boolean(
    feedback && draftStatus && draftStatus !== feedback.status,
  );

  return (
    <Dialog open={feedbackId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Feedback details</DialogTitle>
          <DialogDescription>
            Review the submitted message and update its status if needed.
          </DialogDescription>
        </DialogHeader>
        {detailQuery.isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : null}
        {detailQuery.error ? (
          <Alert variant="destructive">
            <AlertTitle>Unable to load feedback details</AlertTitle>
            <AlertDescription>
              {detailQuery.error instanceof Error
                ? detailQuery.error.message
                : "Please try again."}
            </AlertDescription>
          </Alert>
        ) : null}
        {feedback ? (
          <div className="space-y-6">
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <dt className="text-xs font-medium leading-4 text-muted-foreground">Type</dt>
                <dd className="text-sm font-medium leading-5">{labels[feedback.type]}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium leading-4 text-muted-foreground">Created</dt>
                <dd className="text-sm font-medium leading-5">{formatDateTime(feedback.createdAt)}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium leading-4 text-muted-foreground">Created by</dt>
                <dd className="text-sm font-medium leading-5">{feedback.createdBy.username}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs font-medium leading-4 text-muted-foreground">User ID</dt>
                <dd className="break-all text-sm font-medium leading-5">{feedback.createdBy.id}</dd>
              </div>
            </dl>
            <div className="space-y-2">
              <p className="text-sm font-medium leading-5 text-foreground">Content</p>
              <div className="rounded-lg border border-border/70 bg-muted/20 p-4 text-sm leading-5 whitespace-pre-wrap">
                {feedback.content}
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="feedback-status" className="text-sm font-medium leading-5 text-foreground">
                Status
              </label>
              <Select
                value={draftStatus ?? feedback.status}
                onValueChange={(value) => setDraftStatus(value as FeedbackStatus)}
              >
                <SelectTrigger id="feedback-status" className="w-full">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>{labels[status]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {updateMutation.error ? (
              <Alert variant="destructive">
                <AlertTitle>Unable to save changes</AlertTitle>
                <AlertDescription>
                  {updateMutation.error instanceof Error
                    ? updateMutation.error.message
                    : "Please try again."}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={updateMutation.isPending}>
            Cancel
          </Button>
          <Button type="button" onClick={() => feedback && draftStatus && updateMutation.mutate({ id: feedback.id, status: draftStatus })} disabled={!hasStatusChanged || updateMutation.isPending}>
            {updateMutation.isPending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FeedbackTable({ feedback, onViewDetails }: { feedback: FeedbackSummary[]; onViewDetails: (id: string) => void }) {
  if (!feedback.length) return <EmptySelectionState description="No feedback has been submitted yet." />;
  return (
    <div className={EDITOR_TABLE_SURFACE_CLASS}>
      <Table>
        <TableHeader className={EDITOR_TABLE_HEADER_CLASS}>
          <TableRow>
            <TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Created</TableHead><TableHead>Created by</TableHead><TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {feedback.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{labels[item.type]}</TableCell>
              <TableCell><Badge variant="secondary" size="sm">{labels[item.status]}</Badge></TableCell>
              <TableCell>{formatDateTime(item.createdAt)}</TableCell>
              <TableCell>{item.createdBy.username}</TableCell>
              <TableCell>
                <a
                  href={`#feedback-${item.id}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                  onClick={(event) => { event.preventDefault(); onViewDetails(item.id); }}
                >
                  View details <ExternalLink className="size-3.5" />
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function AdminFeedbackSection() {
  const [page, setPage] = useState(1);
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null);
  const feedbackQuery = useQuery({
    queryKey: ["admin", "feedback-list", page],
    queryFn: () => fetchAdminFeedback(page, FEEDBACKS_PER_PAGE),
    staleTime: QUERY_STALE_TIME_MS,
    retry: false,
  });
  const feedback = feedbackQuery.data?.feedback ?? [];
  const meta = feedbackQuery.data?.meta;
  const pageCount = Math.max(1, Math.ceil((meta?.total ?? 0) / FEEDBACKS_PER_PAGE));

  return (
    <section className="space-y-4">
      <SectionHeader title="Feedback" description="Feedback submitted by registered users." />
      {feedbackQuery.error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load feedback</AlertTitle>
          <AlertDescription>
            {feedbackQuery.error instanceof Error ? feedbackQuery.error.message : "Please try again."}
          </AlertDescription>
        </Alert>
      ) : null}
      {feedbackQuery.isLoading && !feedbackQuery.data ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : (
        <>
          <FeedbackTable feedback={feedback} onViewDetails={setSelectedFeedbackId} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className={EDITOR_BODY_TEXT_CLASS}>
              {meta ? `${meta.total} feedback item${meta.total === 1 ? "" : "s"}.` : ""}
            </p>
            <Pagination page={meta?.page ?? page} pageCount={pageCount} hasNext={meta?.hasNext} onPageChange={setPage} />
          </div>
        </>
      )}
      <FeedbackDetailsDialog feedbackId={selectedFeedbackId} onClose={() => setSelectedFeedbackId(null)} />
    </section>
  );
}
