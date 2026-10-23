"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { createPost, type PostFormState } from "../actions";

const initialState: PostFormState = {};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Writing surfaces have no box or focus ring, so the text reads like the page it becomes.
const surface = "w-full bg-transparent outline-none placeholder:text-muted-foreground";

export function PostEditor() {
  const [state, formAction, pending] = useActionState(createPost, initialState);
  const [slug, setSlug] = useState("");
  // The URL follows the title until it's edited by hand.
  const [slugEdited, setSlugEdited] = useState(false);
  const [publish, setPublish] = useState(false);

  let submitLabel = publish ? "Publish" : "Save draft";
  if (pending) submitLabel = publish ? "Publishing…" : "Saving…";

  return (
    <form action={formAction} className="grid gap-10 lg:grid-cols-[1fr_18rem] lg:gap-14">
      <div className="flex min-w-0 flex-col gap-6">
        <div>
          <label htmlFor="title" className="sr-only">
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            autoFocus
            placeholder="Title"
            defaultValue={state.values?.title}
            aria-invalid={Boolean(state.errors?.title)}
            aria-describedby={state.errors?.title ? "title-error" : undefined}
            onChange={(e) => {
              if (!slugEdited) setSlug(slugify(e.target.value));
            }}
            className={`${surface} font-serif text-4xl leading-tight font-semibold tracking-tight`}
          />
          {state.errors?.title && (
            <FieldError id="title-error" className="mt-2">
              {state.errors.title}
            </FieldError>
          )}
        </div>
        <div>
          <label htmlFor="body" className="sr-only">
            Body
          </label>
          <textarea
            id="body"
            name="body"
            placeholder="Start writing"
            defaultValue={state.values?.body}
            className={`${surface} field-sizing-content min-h-48 resize-none lg:min-h-[50vh] font-serif text-[1.1875rem] leading-[1.7]`}
          />
        </div>
      </div>

      <aside className="lg:sticky lg:top-10 lg:self-start">
        <div className="flex flex-col gap-6 rounded-xl border p-5">
          <Field data-invalid={Boolean(state.errors?.slug)}>
            <FieldLabel htmlFor="slug">URL</FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <InputGroupText>/posts/</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id="slug"
                name="slug"
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                title="Lowercase letters, numbers and single dashes"
                placeholder="my-post"
                value={slug}
                aria-invalid={Boolean(state.errors?.slug)}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setSlugEdited(e.target.value !== "");
                }}
              />
            </InputGroup>
            {state.errors?.slug ? (
              <FieldError>{state.errors.slug}</FieldError>
            ) : (
              <FieldDescription>Filled in from the title. Edit it to choose your own.</FieldDescription>
            )}
          </Field>

          <Field>
            <FieldLabel className="w-full justify-between">
              Publish now
              <Switch name="publish" checked={publish} onCheckedChange={setPublish} />
            </FieldLabel>
            <FieldDescription>
              {publish ? "It goes live on the blog when you save." : "It stays a private draft."}
            </FieldDescription>
          </Field>

          <Button type="submit" size="lg" disabled={pending} className="w-full">
            {submitLabel}
          </Button>
        </div>
      </aside>
    </form>
  );
}
