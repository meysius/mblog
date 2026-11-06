"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requestPasswordReset, type ResetRequestState } from "../../auth-actions";

const initialState: ResetRequestState = {};

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState);

  if (state.sentTo) {
    return (
      <div role="status" className="flex flex-col gap-6 text-sm">
        <p>
          If <strong className="font-medium">{state.sentTo}</strong> has an account, a link to
          reset its password is on its way. It works for an hour.
        </p>
        <p className="text-muted-foreground">
          Nothing after a few minutes? Check your spam folder, or make sure that’s the email
          you signed up with.
        </p>
        <BackToSignIn />
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field data-invalid={Boolean(state.error)}>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          defaultValue={state.values?.email}
          aria-invalid={Boolean(state.error)}
        />
        {state.error && <FieldError>{state.error}</FieldError>}
      </Field>
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Sending…" : "Send reset link"}
      </Button>
      <BackToSignIn />
    </form>
  );
}

function BackToSignIn() {
  return (
    <Link
      href="/admin/login"
      className="self-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
    >
      Back to sign in
    </Link>
  );
}
