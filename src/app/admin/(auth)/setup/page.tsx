import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { hasUsers } from "@/lib/auth";
import { FormSkeleton } from "../form-skeleton";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Set up" };

export default function SetupPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-2 mb-8 text-sm text-muted-foreground">
        This is the owner account for the blog. You’ll use it to sign in to the admin.
      </p>
      <Suspense fallback={<FormSkeleton fields={3} />}>
        <Setup />
      </Suspense>
    </>
  );
}

async function Setup() {
  await connection();
  // Setup only runs once; after that the owner signs in normally.
  if (await hasUsers()) redirect("/admin/login");
  return <SetupForm />;
}
