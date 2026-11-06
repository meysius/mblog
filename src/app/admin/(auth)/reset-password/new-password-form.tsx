"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type NewPasswordState, setNewPassword } from "../../auth-actions";

const initialState: NewPasswordState = {};

export function NewPasswordForm({ token, email }: { token: string; email: string }) {
  const [state, formAction, pending] = useActionState(setNewPassword, initialState);
  if (state.expired) return <ExpiredLink />;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="token" value={token} />
      {/* Lets password managers save the new password under the right account. */}
      <input type="email" name="email" value={email} autoComplete="username" readOnly hidden />
      <p className="text-sm text-muted-foreground">
        For <span className="font-medium text-foreground">{email}</span>. Every device signed in to
        the account will be signed out.
      </p>
      <Field data-invalid={Boolean(state.error)}>
        <FieldLabel htmlFor="password">New password</FieldLabel>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          autoFocus
          minLength={10}
          aria-invalid={Boolean(state.error)}
        />
        {state.error ? (
          <FieldError>{state.error}</FieldError>
        ) : (
          <FieldDescription>At least 10 characters.</FieldDescription>
        )}
      </Field>
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Saving…" : "Save and sign in"}
      </Button>
    </form>
  );
}

export function ExpiredLink() {
  return (
    <div role="alert" className="flex flex-col gap-6 text-sm">
      <p>This link has expired or was already used. Links work once, for an hour.</p>
      <Link href="/admin/forgot-password" className={buttonVariants({ size: "lg", className: "w-full" })}>
        Send a new link
      </Link>
    </div>
  );
}
