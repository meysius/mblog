import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { hasUsers } from "@/lib/auth";
import { FormSkeleton } from "../form-skeleton";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Sign in</h1>
      <Suspense fallback={<FormSkeleton fields={2} />}>
        <Login />
      </Suspense>
    </>
  );
}

async function Login() {
  await connection();
  // Until the owner account exists there's nobody to sign in as.
  if (!(await hasUsers())) redirect("/admin/setup");
  return <LoginForm />;
}
