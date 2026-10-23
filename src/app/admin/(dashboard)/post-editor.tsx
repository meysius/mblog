"use client";

import { ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Markdown } from "@/components/markdown";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { EditablePost } from "@/lib/posts";
import { deletePost, type PostFormState } from "../actions";

const initialState: PostFormState = {};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function submitLabel(wasPublished: boolean, publish: boolean, pending: boolean) {
  if (wasPublished && publish) return pending ? "Updating…" : "Update";
  if (wasPublished) return pending ? "Unpublishing…" : "Unpublish";
  if (publish) return pending ? "Publishing…" : "Publish";
  return pending ? "Saving…" : "Save draft";
}

function publishDescription(wasPublished: boolean, publish: boolean) {
  if (wasPublished && publish) return "It’s live on the blog. Saving updates it.";
  if (wasPublished) return "Saving takes it off the blog and makes it a draft again.";
  if (publish) return "It goes live on the blog when you save.";
  return "It stays a private draft.";
}

// Writing surfaces have no box or focus ring, so the text reads like the page it becomes.
const surface = "w-full bg-transparent outline-none placeholder:text-muted-foreground";
const bodyHeight = "min-h-48 lg:min-h-[50vh]";

type PostEditorProps = {
  /** The saved post when editing; omitted for a new post. */
  post?: EditablePost;
  action: (state: PostFormState, formData: FormData) => Promise<PostFormState>;
};

export function PostEditor({ post, action }: PostEditorProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  // A new post's URL follows the title until it's edited by hand. Saved posts keep theirs.
  const [slugEdited, setSlugEdited] = useState(Boolean(post));
  const wasPublished = Boolean(post?.publishedAt);
  const [publish, setPublish] = useState(wasPublished);

  // The action refreshes `post` after a save, so this clears once the save lands.
  const dirty =
    post !== undefined &&
    (title.trim() !== post.title ||
      slug.trim() !== post.slug ||
      body !== post.body ||
      publish !== wasPublished);

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
            autoFocus={!post}
            placeholder="Title"
            value={title}
            aria-invalid={Boolean(state.errors?.title)}
            aria-describedby={state.errors?.title ? "title-error" : undefined}
            onChange={(e) => {
              setTitle(e.target.value);
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

        <Tabs defaultValue="write" className="gap-5">
          <TabsList variant="line">
            <TabsTrigger value="write">Write</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          {/* Kept mounted so the body is still submitted while previewing. */}
          <TabsContent value="write" keepMounted>
            <label htmlFor="body" className="sr-only">
              Body
            </label>
            <textarea
              id="body"
              name="body"
              placeholder="Start writing. Markdown works here."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={`${surface} ${bodyHeight} field-sizing-content resize-none font-serif text-[1.1875rem] leading-[1.7]`}
            />
          </TabsContent>
          <TabsContent value="preview" className={bodyHeight}>
            {body.trim() ? (
              <Markdown className="max-w-[65ch]">{body}</Markdown>
            ) : (
              <p className="font-serif text-[1.1875rem] text-muted-foreground">
                Nothing to preview yet.
              </p>
            )}
          </TabsContent>
        </Tabs>
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
                  setSlugEdited(Boolean(post) || e.target.value !== "");
                }}
              />
            </InputGroup>
            {state.errors?.slug ? (
              <FieldError>{state.errors.slug}</FieldError>
            ) : (
              <FieldDescription>
                {post
                  ? "Changing it breaks existing links to the post."
                  : "Filled in from the title. Edit it to choose your own."}
              </FieldDescription>
            )}
          </Field>

          <Field>
            <FieldLabel className="w-full justify-between">
              {wasPublished ? "Published" : "Publish now"}
              <Switch checked={publish} onCheckedChange={setPublish} />
            </FieldLabel>
            {/* React resets the form after each save, which would also reset the switch's
                own checkbox; a hidden input always submits the switch's current state. */}
            <input type="hidden" name="publish" value={publish ? "on" : ""} />
            <FieldDescription>{publishDescription(wasPublished, publish)}</FieldDescription>
          </Field>

          <div className="flex flex-col gap-2">
            <Button type="submit" size="lg" disabled={pending} className="w-full">
              {submitLabel(wasPublished, publish, pending)}
            </Button>
            {post && (
              <p aria-live="polite" className="h-5 text-center text-sm text-muted-foreground">
                {dirty ? "Unsaved changes" : state.savedAt ? "Saved" : null}
              </p>
            )}
          </div>

          {post && (
            <div className="-mb-2 border-t pt-3">
              <div className="-mx-2 flex items-center justify-between gap-2">
                {wasPublished ? (
                  <Link
                    href={`/posts/${post.slug}`}
                    target="_blank"
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    View post
                    <ExternalLink data-icon="inline-end" />
                  </Link>
                ) : (
                  <span />
                )}
                <DeletePostButton id={post.id} title={post.title} />
              </div>
            </div>
          )}
        </div>
      </aside>
    </form>
  );
}

function DeletePostButton({ id, title }: { id: number; title: string }) {
  const [deleting, startDeleting] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={<Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" />}
      >
        <Trash2 data-icon="inline-start" />
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this post?</AlertDialogTitle>
          <AlertDialogDescription>
            “{title}” will be removed from the blog and the admin. This can’t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleting}
            onClick={() => startDeleting(() => deletePost(id))}
          >
            {deleting ? "Deleting…" : "Delete post"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
