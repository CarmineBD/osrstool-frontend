import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, MessageSquarePlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { RequiredMark } from "@/components/RequiredMark";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  createFeedback,
  FEEDBACK_DISCORD_FORUM_URL,
  FEEDBACK_TYPES,
  type FeedbackType,
} from "@/lib/feedback";

const labels: Record<FeedbackType, string> = {
  feature: "Feature",
  bug: "Bug",
  improvement: "Improvement",
  other: "Other",
};
const MIN_CONTENT_LENGTH = 10;
const MAX_CONTENT_LENGTH = 5000;

export function FeedbackPage() {
  const navigate = useNavigate();
  const [type, setType] = useState<FeedbackType | null>(null);
  const [content, setContent] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: createFeedback });
  const trimmedContent = content.trim();
  const isContentValid =
    trimmedContent.length >= MIN_CONTENT_LENGTH &&
    trimmedContent.length <= MAX_CONTENT_LENGTH;
  const isFormValid = type !== null && isContentValid;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError(null);
    if (!type) {
      setValidationError("Select a feedback type.");
      return;
    }
    if (!isContentValid) {
      setValidationError(
        `Feedback must be between ${MIN_CONTENT_LENGTH} and ${MAX_CONTENT_LENGTH} characters.`,
      );
      return;
    }
    mutation.mutate(
      { type, content: trimmedContent },
      { onSuccess: () => setContent("") },
    );
  };

  const handleCreateAnother = () => {
    mutation.reset();
    setType(null);
    setContent("");
    setValidationError(null);
  };

  if (mutation.isSuccess) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <Card className="rounded-xl border-border/70 shadow-sm">
          <CardContent className="space-y-6 p-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted text-primary">
              <CheckCircle2 className="size-6" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-semibold leading-9 tracking-tight">
                Feedback sent successfully
              </CardTitle>
              <CardDescription className="mx-auto max-w-lg text-sm leading-5">
                Thank you for your feedback. We value your comments and will read
                and consider your proposal.
              </CardDescription>
            </div>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button type="button" onClick={() => navigate("/")}>
                Return home
              </Button>
              <Button type="button" variant="outline" onClick={handleCreateAnother}>
                Send another feedback
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Card className="rounded-xl border-border/70 shadow-sm">
        <CardHeader className="gap-4 p-6">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-primary">
            <MessageSquarePlus className="size-5" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-semibold leading-9 tracking-tight">
              Send feedback
            </CardTitle>
            <CardDescription className="text-sm leading-5">
              Tell us what would make RSMethods more useful for you.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-6 pt-0">
          {validationError || mutation.error ? (
            <Alert variant="destructive">
              <AlertTitle>Unable to send feedback</AlertTitle>
              <AlertDescription>
                {validationError ??
                  (mutation.error instanceof Error
                    ? mutation.error.message
                    : "Please try again.")}
              </AlertDescription>
            </Alert>
          ) : null}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="feedback-type" className="text-sm font-medium leading-5 text-foreground">
                Feedback type <RequiredMark />
              </label>
              <Select
                value={type ?? undefined}
                onValueChange={(value) => setType(value as FeedbackType)}
              >
                <SelectTrigger id="feedback-type" className="w-full">
                  <SelectValue placeholder="Select a feedback type" />
                </SelectTrigger>
                <SelectContent>
                  {FEEDBACK_TYPES.map((feedbackType) => (
                    <SelectItem key={feedbackType} value={feedbackType}>
                      {labels[feedbackType]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="feedback-content" className="text-sm font-medium leading-5 text-foreground">
                Your feedback <RequiredMark />
              </label>
              <Textarea
                id="feedback-content"
                value={content}
                maxLength={MAX_CONTENT_LENGTH}
                minLength={MIN_CONTENT_LENGTH}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Describe your idea, issue, or improvement."
                aria-describedby="feedback-content-help"
                className="min-h-40 resize-y"
              />
              <p id="feedback-content-help" className="text-xs font-medium leading-4 text-muted-foreground">
                {trimmedContent.length} / {MAX_CONTENT_LENGTH} characters. Minimum {MIN_CONTENT_LENGTH}.
              </p>
            </div>
            <Button type="submit" disabled={mutation.isPending || !isFormValid}>
              {mutation.isPending ? "Sending..." : "Send feedback"}
            </Button>
          </form>
          <p className="border-t border-border/70 pt-6 text-sm leading-5 text-muted-foreground">
            Need to share screenshots or discuss your idea?{" "}
            <a
              href={FEEDBACK_DISCORD_FORUM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline underline-offset-4 hover:text-primary/80"
            >
              Join our Discord.
            </a>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}

export default FeedbackPage;
