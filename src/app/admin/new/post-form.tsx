"use client";

import { useActionState } from "react";
import { createPost, type PostFormState } from "../actions";

const initialState: PostFormState = {};

export function PostForm() {
  const [state, formAction, pending] = useActionState(createPost, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        Title
        <input
          name="title"
          required
          defaultValue={state.values?.title}
          className="rounded border px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1">
        Slug
        <input
          name="slug"
          required
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          title="Lowercase letters, numbers and dashes"
          defaultValue={state.values?.slug}
          className="rounded border px-2 py-1 font-mono"
        />
      </label>
      <label className="flex flex-col gap-1">
        Body
        <textarea
          name="body"
          rows={12}
          defaultValue={state.values?.body}
          className="rounded border px-2 py-1 font-mono"
        />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" name="publish" />
        Publish now
      </label>
      {state.error && (
        <p role="alert" className="text-red-600">
          {state.error}
        </p>
      )}
      <button
        disabled={pending}
        className="self-start rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
