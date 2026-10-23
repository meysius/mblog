"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { setUp, type SetupState } from "../../auth-actions";

const initialState: SetupState = {};

export function SetupForm() {
  const [state, formAction, pending] = useActionState(setUp, initialState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Field data-invalid={Boolean(errors.name)}>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          required
          autoFocus
          defaultValue={state.values?.name}
          aria-invalid={Boolean(errors.name)}
        />
        {errors.name && <FieldError>{errors.name}</FieldError>}
      </Field>
      <Field data-invalid={Boolean(errors.email)}>
        <FieldLabel htmlFor="email">Email</FieldLabel>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.values?.email}
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email && <FieldError>{errors.email}</FieldError>}
      </Field>
      <Field data-invalid={Boolean(errors.password)}>
        <FieldLabel htmlFor="password">Password</FieldLabel>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          aria-invalid={Boolean(errors.password)}
        />
        {errors.password ? (
          <FieldError>{errors.password}</FieldError>
        ) : (
          <FieldDescription>At least 10 characters.</FieldDescription>
        )}
      </Field>
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
