"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

type SaveButtonProps = React.ComponentProps<typeof Button> & {
  /**
   * Publish, schedule or unpublish along with the save. Without one, the post
   * stays as it is.
   */
  intent?: "publish" | "schedule" | "unpublish";
  pendingLabel: string;
};

/** Submits the post editor's form, saying so while that's this button's save. */
export function SaveButton({ intent, pendingLabel, disabled, children, ...props }: SaveButtonProps) {
  const { pending, data } = useFormStatus();
  const saving = pending && (data?.get("intent") ?? undefined) === intent;

  return (
    <Button
      type="submit"
      name={intent && "intent"}
      value={intent}
      disabled={pending || disabled}
      {...props}
    >
      {saving ? pendingLabel : children}
    </Button>
  );
}
