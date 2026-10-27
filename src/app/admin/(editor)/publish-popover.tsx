"use client";

import { useState } from "react";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SaveButton } from "./save-button";

// The value a datetime-local input shows for this moment, in the browser's time zone.
function toDateTimeLocal(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

const HOUR = 60 * 60 * 1000;

type PublishPopoverProps = {
  /** The button that opens it. */
  trigger: React.ReactElement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The editor's form. The popover renders outside it, so its fields and buttons name it. */
  form: string;
  /** When the post is scheduled for, if it is. Rescheduling starts from that time. */
  scheduledAt: Date | null;
  /** From the last save, when the time picked couldn't be used. */
  error?: string;
  disabled?: boolean;
};

/** Publishes a post now, or schedules it for a time still to come. */
export function PublishPopover({
  trigger,
  open,
  onOpenChange,
  form,
  scheduledAt,
  error,
  disabled,
}: PublishPopoverProps) {
  const [when, setWhen] = useState<"now" | "later">("now");
  // The time picked, as the input shows it. Earliest is when the popover opened.
  const [time, setTime] = useState("");
  const [earliest, setEarliest] = useState("");
  // Checked as it's picked; saving checks again, since time keeps passing.
  const [timeIsLater, setTimeIsLater] = useState(false);

  function pick(value: string) {
    setTime(value);
    setTimeIsLater(value !== "" && new Date(value).getTime() > Date.now());
  }

  function start() {
    setWhen(scheduledAt ? "later" : "now");
    // A new schedule starts on the hour, at least an hour from now.
    pick(toDateTimeLocal(scheduledAt ?? new Date(Math.ceil((Date.now() + HOUR) / HOUR) * HOUR)));
    setEarliest(toDateTimeLocal(new Date()));
  }

  const later = when === "later";

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (next) start();
        onOpenChange(next);
      }}
    >
      <PopoverTrigger render={trigger} />
      <PopoverContent align="end" className="w-80 gap-4 p-4">
        <PopoverHeader>
          <PopoverTitle>{scheduledAt ? "Reschedule" : "Publish"}</PopoverTitle>
          <PopoverDescription>When should the post go live?</PopoverDescription>
        </PopoverHeader>

        <RadioGroup
          aria-label="When"
          value={when}
          onValueChange={(value) => setWhen(value === "later" ? "later" : "now")}
        >
          <Field orientation="horizontal">
            <RadioGroupItem id="publish-now" value="now" />
            <FieldLabel htmlFor="publish-now" className="font-normal">
              Now
            </FieldLabel>
          </Field>
          <Field orientation="horizontal">
            <RadioGroupItem id="publish-later" value="later" />
            <FieldLabel htmlFor="publish-later" className="font-normal">
              At a later time
            </FieldLabel>
          </Field>
        </RadioGroup>

        {later && (
          <Field data-invalid={Boolean(error)}>
            <Input
              type="datetime-local"
              aria-label="Publish time"
              value={time}
              min={earliest}
              aria-invalid={Boolean(error)}
              onChange={(e) => pick(e.target.value)}
              // Enter would submit the form with its first button, Save draft.
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault();
              }}
            />
            <input
              type="hidden"
              form={form}
              name="publishedAt"
              value={timeIsLater ? new Date(time).toISOString() : ""}
            />
            {error ? (
              <FieldError>{error}</FieldError>
            ) : (
              <FieldDescription>
                In your time zone, {Intl.DateTimeFormat().resolvedOptions().timeZone}.
              </FieldDescription>
            )}
          </Field>
        )}

        {later ? (
          <SaveButton
            form={form}
            intent="schedule"
            pendingLabel="Scheduling…"
            disabled={disabled || !timeIsLater}
          >
            Schedule
          </SaveButton>
        ) : (
          <SaveButton form={form} intent="publish" pendingLabel="Publishing…" disabled={disabled}>
            Publish now
          </SaveButton>
        )}
      </PopoverContent>
    </Popover>
  );
}
