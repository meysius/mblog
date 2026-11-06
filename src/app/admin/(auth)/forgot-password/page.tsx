import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { hasUsers } from "@/lib/auth";
import { FormSkeleton } from "../form-skeleton";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-2 mb-8 text-sm text-muted-foreground">
        Enter your account’s email, and we’ll send you a link to choose a new password.
      </p>
      <Suspense fallback={<FormSkeleton fields={1} />}>
        <ForgotPassword />
      </Suspense>
    </>
  );
}

async function ForgotPassword() {
  await connection();
  // Until the owner account exists there's no password to reset.
  if (!(await hasUsers())) redirect("/admin/setup");
  return <ForgotPasswordForm />;
}
