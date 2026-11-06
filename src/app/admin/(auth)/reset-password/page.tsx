import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { resetLinkEmail } from "@/lib/password-reset";
import { FormSkeleton } from "../form-skeleton";
import { ExpiredLink, NewPasswordForm } from "./new-password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
  // The address holds the reset token, so don't pass it on to other sites.
  referrer: "no-referrer",
};

export default function ResetPasswordPage({ searchParams }: PageProps<"/admin/reset-password">) {
  return (
    <>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Choose a new password</h1>
      <Suspense fallback={<FormSkeleton fields={1} />}>
        <ResetPassword searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function ResetPassword({
  searchParams,
}: {
  searchParams: PageProps<"/admin/reset-password">["searchParams"];
}) {
  await connection();
  const { token } = await searchParams;
  if (typeof token !== "string") return <ExpiredLink />;
  const email = await resetLinkEmail(token);
  return email ? <NewPasswordForm token={token} email={email} /> : <ExpiredLink />;
}
