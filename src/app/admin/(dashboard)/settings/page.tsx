import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { getSettingsForEditing } from "@/lib/site";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <h1 className="mb-8 text-2xl font-semibold tracking-tight">Settings</h1>
      <Suspense fallback={<SettingsSkeleton />}>
        <Settings />
      </Suspense>
    </>
  );
}

async function Settings() {
  // Render at request time so the form always opens the saved settings.
  await connection();
  return <SettingsForm settings={await getSettingsForEditing()} />;
}

function SettingsSkeleton() {
  return (
    <div aria-hidden className="flex max-w-xl flex-col gap-6">
      <Skeleton className="h-5 w-12" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
