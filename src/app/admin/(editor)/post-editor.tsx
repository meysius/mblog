"use client";

import { ArrowLeft, ArrowUpRight, Eye, ImagePlus, PanelRight, PenLine, Trash2, X } from "lucide-react";
import Link from "next/link";
import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { flushSync } from "react-dom";
import { LocalDateTime, useHydrated } from "@/components/local-date-time";
import { PostArticle } from "@/components/post-article";
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
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDateTime, formatShortDate } from "@/lib/format";
import { IMAGE_TYPES, uploadImage, type MediaImage } from "@/lib/media";
import { listPath, type PostKind, previewPath, readerPath } from "@/lib/post-kind";
import type { EditablePost, PostTag } from "@/lib/posts";
import { EXCERPT_MAX_LENGTH, joinLines } from "@/lib/excerpt";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { deletePost, type PostFormState } from "../actions";
import { FeatureImageField } from "./feature-image-field";
import { PublishPopover } from "./publish-popover";
import { SaveButton } from "./save-button";
import { TagField } from "./tag-field";
import { useBodyImages } from "./use-body-images";

const initialState: PostFormState = {};

// Writing surfaces have no box or focus ring, so the text reads like the page it
// becomes. Type sizes match the published post (src/components/post-article.tsx).
const surface =
  "w-full field-sizing-content resize-none bg-transparent outline-none placeholder:text-muted-foreground";

// Where the settings panel fits beside the writing column, it starts open.
const WIDE = "(min-width: 64rem)";
function subscribeToWidth(onChange: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

type PostEditorProps = {
  /** Pages have no tags, and are at /<slug> rather than /posts/<slug>. */
  kind: PostKind;
  /** The saved post or page when editing; omitted for a new one. */
  post?: EditablePost;
  /** Every saved tag, for the tag field to suggest. Posts only. */
  tagOptions?: PostTag[];
  action: (state: PostFormState, formData: FormData) => Promise<PostFormState>;
};

export function PostEditor({ kind, post, tagOptions = [], action }: PostEditorProps) {
  const Noun = kind === "page" ? "Page" : "Post";
  const [state, formAction, pending] = useActionState(action, initialState);
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  // A new post's URL follows the title until it's edited by hand. Saved posts keep theirs.
  const [slugEdited, setSlugEdited] = useState(Boolean(post));
  const [featureImage, setFeatureImage] = useState(post?.featureImage ?? null);
  const [featureImageAlt, setFeatureImageAlt] = useState(post?.featureImageAlt ?? "");
  const savedTags = post?.tags.map((tag) => tag.name) ?? [];
  const [tags, setTags] = useState(savedTags);
  // "write" or "preview": the post as readers will see it, unsaved changes included.
  const [mode, setMode] = useState("write");
  const status = post?.status ?? "draft";
  const publishedAt = post?.publishedAt ?? null;
  const [featured, setFeatured] = useState(post?.featured ?? false);
  // Publishing a post asks whether it goes live now or later (publish-popover.tsx).
  const [publishOpen, setPublishOpen] = useState(false);
  const hydrated = useHydrated();
  const formId = useId();

  // Until it's toggled, CSS decides whether the panel shows, so the server render
  // matches every screen size.
  const [settingsOpen, setSettingsOpen] = useState<boolean>();
  const wide = useSyncExternalStore(
    subscribeToWidth,
    () => window.matchMedia(WIDE).matches,
    () => true,
  );
  const showSettings = settingsOpen ?? wide;
  const settingsId = useId();

  // Show the fields errors come back for: the title is only in Write, the URL in settings.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.errors?.title) setMode("write");
    if (state.errors?.slug) setSettingsOpen(true);
    if (!state.errors?.publishedAt) setPublishOpen(false);
  }

  // Saving waits until uploads finish, so no placeholder or missing image gets saved.
  const [uploads, setUploads] = useState(0);
  async function upload(file: File): Promise<MediaImage> {
    setUploads((n) => n + 1);
    try {
      return await uploadImage(file);
    } finally {
      setUploads((n) => n - 1);
    }
  }

  const bodyRef = useRef<HTMLTextAreaElement>(null);
  // Until the body is first focused, its caret is at the start, which is no place for an image.
  const bodyFocused = useRef(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const bodyImages = useBodyImages(bodyRef, setBody, upload);

  // A file dropped outside a drop zone would make the browser open it, leaving the editor.
  useEffect(() => {
    const ignoreFileDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", ignoreFileDrop);
    window.addEventListener("drop", ignoreFileDrop);
    return () => {
      window.removeEventListener("dragover", ignoreFileDrop);
      window.removeEventListener("drop", ignoreFileDrop);
    };
  }, []);

  // The action refreshes `post` after a save, so this clears once the save lands.
  const dirty =
    post !== undefined &&
    (title.trim() !== post.title ||
      slug.trim() !== post.slug ||
      body !== post.body ||
      excerpt.trim() !== post.excerpt ||
      (featureImage?.id ?? null) !== (post.featureImage?.id ?? null) ||
      featureImageAlt.trim() !== post.featureImageAlt ||
      tags.join("\n") !== savedTags.join("\n") ||
      featured !== post.featured);

  // Preview shows the saved post, so with unsaved edits it saves first. Browsers
  // only open tabs right on a click, so the tab opens then and loads once the save lands.
  const previewTab = useRef<Window | null>(null);
  useEffect(() => {
    const tab = previewTab.current;
    if (!tab || pending) return;
    previewTab.current = null;
    if (state.errors || !post) tab.close();
    else tab.location.href = previewPath(kind, post.id);
  }, [state, pending, post, kind]);

  const busy = pending || uploads > 0;

  return (
    <form id={formId} action={formAction} className="flex flex-1 flex-col">
      <Tabs value={mode} onValueChange={setMode} className="flex-1 gap-0">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur sm:px-4 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={listPath(kind)}
              className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground")}
            >
              <ArrowLeft data-icon="inline-start" />
              <span className="max-sm:sr-only">{Noun}s</span>
            </Link>
            {/* No room on phones, where the settings panel shows the status instead. */}
            <div className="flex min-w-0 items-center gap-2.5 text-sm max-sm:sr-only">
              {status === "published" ? (
                <Badge>Published</Badge>
              ) : status === "scheduled" && publishedAt ? (
                <Badge variant="outline">
                  Scheduled
                  {hydrated && <span aria-hidden>·</span>}
                  <LocalDateTime date={publishedAt} short />
                </Badge>
              ) : (
                <Badge variant="secondary">Draft</Badge>
              )}
              <span aria-live="polite" className="truncate text-muted-foreground max-md:sr-only">
                {uploads > 0
                  ? "Uploading image…"
                  : dirty
                    ? "Unsaved changes"
                    : state.savedAt
                      ? "Saved"
                      : null}
              </span>
            </div>
          </div>

          {/* Writing tools, centered over the page on wider screens. */}
          <div className="flex items-center gap-1">
            <TabsList aria-label="Mode">
              <TabsTrigger value="write" className="sm:px-2.5">
                <PenLine />
                <span className="max-sm:sr-only">Write</span>
              </TabsTrigger>
              <TabsTrigger value="preview" className="sm:px-2.5">
                <Eye />
                <span className="max-sm:sr-only">Preview</span>
              </TabsTrigger>
            </TabsList>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Insert image"
                    disabled={mode !== "write"}
                    className="text-muted-foreground"
                    onClick={() => imageInput.current?.click()}
                  />
                }
              >
                <ImagePlus />
              </TooltipTrigger>
              <TooltipContent side="bottom">Insert image</TooltipContent>
            </Tooltip>
            <input
              ref={imageInput}
              type="file"
              accept={IMAGE_TYPES}
              multiple
              hidden
              onChange={(e) => {
                const el = bodyRef.current;
                if (el && !bodyFocused.current) {
                  el.setSelectionRange(el.value.length, el.value.length);
                }
                bodyImages.insertImages([...(e.target.files ?? [])]);
                e.target.value = "";
              }}
            />
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            {status !== "draft" ? (
              <SaveButton pendingLabel="Updating…" disabled={uploads > 0}>
                Update
              </SaveButton>
            ) : (
              <>
                <SaveButton variant="outline" pendingLabel="Saving…" disabled={uploads > 0}>
                  <span>
                    Save<span className="max-sm:hidden"> draft</span>
                  </span>
                </SaveButton>
                {kind === "post" ? (
                  <PublishPopover
                    trigger={<Button disabled={busy}>Publish</Button>}
                    open={publishOpen}
                    onOpenChange={setPublishOpen}
                    form={formId}
                    scheduledAt={null}
                    error={state.errors?.publishedAt}
                    disabled={uploads > 0}
                  />
                ) : (
                  <SaveButton intent="publish" pendingLabel="Publishing…" disabled={uploads > 0}>
                    Publish
                  </SaveButton>
                )}
              </>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`${Noun} settings`}
              aria-controls={settingsId}
              aria-expanded={showSettings}
              className="text-muted-foreground aria-expanded:text-foreground"
              onClick={() => setSettingsOpen(!showSettings)}
            >
              <PanelRight />
            </Button>
          </div>
        </header>

        <div className="flex flex-1">
          <div className="min-w-0 flex-1 pt-12 pb-24 sm:pt-16">
            <div className="mx-auto w-full max-w-3xl px-6">
              {/* Kept mounted so the title and body are still submitted while previewing. */}
              <TabsContent value="write" keepMounted className="flex flex-col gap-6">
                <div>
                  <label htmlFor="title" className="sr-only">
                    Title
                  </label>
                  <textarea
                    id="title"
                    name="title"
                    rows={1}
                    required
                    autoFocus={!post}
                    placeholder="Title"
                    value={title}
                    aria-invalid={Boolean(state.errors?.title)}
                    aria-describedby={state.errors?.title ? "title-error" : undefined}
                    onChange={(e) => {
                      // A title is one line, even when pasted from several.
                      const value = e.target.value.replace(/\s*\n\s*/g, " ");
                      setTitle(value);
                      if (!slugEdited) setSlug(slugify(value));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        bodyRef.current?.focus();
                      }
                    }}
                    // The browser can only point out a field it can see.
                    onInvalid={() => flushSync(() => setMode("write"))}
                    className={`${surface} font-serif text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl`}
                  />
                  {state.errors?.title && (
                    <FieldError id="title-error" className="mt-2">
                      {state.errors.title}
                    </FieldError>
                  )}

                  <label htmlFor="excerpt" className="sr-only">
                    Excerpt
                  </label>
                  <textarea
                    id="excerpt"
                    name="excerpt"
                    rows={1}
                    maxLength={EXCERPT_MAX_LENGTH}
                    placeholder="Add an excerpt"
                    value={excerpt}
                    aria-describedby="excerpt-hint"
                    onChange={(e) => setExcerpt(joinLines(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                        e.preventDefault();
                        bodyRef.current?.focus();
                      }
                    }}
                    // Styled like it is under the published post's title.
                    className={cn(
                      surface,
                      "peer mt-4 font-serif text-xl leading-snug text-pretty text-muted-foreground placeholder:text-muted-foreground/50 sm:text-2xl",
                    )}
                  />
                  <p
                    id="excerpt-hint"
                    className="mt-2 hidden justify-between gap-4 text-xs text-muted-foreground peer-focus:flex"
                  >
                    <span>
                      {kind === "page"
                        ? "Shown under the title and in search results."
                        : "Shown under the title, in post lists and in search results."}
                    </span>
                    <span className="tabular-nums">
                      {excerpt.length}/{EXCERPT_MAX_LENGTH}
                    </span>
                  </p>
                </div>

                <div>
                  <label htmlFor="body" className="sr-only">
                    Body
                  </label>
                  <textarea
                    ref={bodyRef}
                    id="body"
                    name="body"
                    placeholder="Start writing. Markdown works here, and you can paste or drop images."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onFocus={() => (bodyFocused.current = true)}
                    onPaste={(e) => {
                      const files = [...e.clipboardData.files];
                      if (files.some((file) => file.type.startsWith("image/"))) {
                        e.preventDefault();
                        bodyImages.insertImages(files);
                      }
                    }}
                    onDrop={(e) => {
                      if (!e.dataTransfer.types.includes("Files")) return;
                      e.preventDefault();
                      bodyImages.insertImages([...e.dataTransfer.files]);
                    }}
                    className={`${surface} min-h-[50vh] max-w-[65ch] font-serif text-[1.1875rem] leading-[1.7]`}
                  />
                  {bodyImages.error && <FieldError className="mt-3">{bodyImages.error}</FieldError>}
                </div>
              </TabsContent>

              <TabsContent value="preview">
                {title.trim() || excerpt.trim() || body.trim() || featureImage ? (
                  <PostArticle
                    kind={kind}
                    post={{
                      title: title.trim() || "Untitled",
                      excerpt: excerpt.trim(),
                      body,
                      publishedAt,
                      featureImage,
                      featureImageAlt: featureImageAlt.trim(),
                      // A new tag's URL is settled when it's saved; slugify is a close guess.
                      tags: tags.map((name) => ({
                        name,
                        slug: tagOptions.find((tag) => tag.name === name)?.slug ?? slugify(name),
                      })),
                    }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
                )}
              </TabsContent>
            </div>
          </div>

          {/* Always mounted, so its fields are submitted while it's closed. */}
          <aside
            id={settingsId}
            aria-label={`${Noun} settings`}
            className={cn(
              settingsOpen === undefined ? "hidden lg:flex" : settingsOpen ? "flex" : "hidden",
              "fixed inset-x-0 top-14 bottom-0 z-30 flex-col gap-7 overflow-y-auto border-l bg-background p-5 shadow-lg sm:left-auto sm:w-80",
              "lg:sticky lg:h-[calc(100svh-3.5rem)] lg:shrink-0 lg:shadow-none",
            )}
          >
            <div className="-my-1 flex items-center justify-between lg:hidden">
              <h2 className="font-medium">{Noun} settings</h2>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Close settings"
                className="-mr-1.5"
                onClick={() => setSettingsOpen(false)}
              >
                <X />
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <FieldTitle>Status</FieldTitle>
              {status === "published" && publishedAt ? (
                <p className="text-sm text-muted-foreground">
                  Published {formatShortDate(publishedAt)}. Saving updates it on the blog.
                </p>
              ) : status === "scheduled" && publishedAt ? (
                <p className="text-sm text-muted-foreground">
                  Scheduled{hydrated && ` for ${formatDateTime(publishedAt)}`}. Only you can see
                  it until then.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Draft. Only you can see it until you publish it.
                </p>
              )}
              {post && (
                <div className="flex flex-wrap gap-2">
                  {status === "published" ? (
                    <>
                      <Link
                        href={readerPath(kind, post.slug)}
                        target="_blank"
                        className={cn(buttonVariants({ variant: "outline" }))}
                      >
                        View {kind}
                        <ArrowUpRight data-icon="inline-end" />
                      </Link>
                      <SaveButton
                        intent="unpublish"
                        variant="outline"
                        pendingLabel="Unpublishing…"
                        disabled={uploads > 0}
                      >
                        Unpublish
                      </SaveButton>
                    </>
                  ) : (
                    // The saved post at its own URL, in the site's layout. Not a submit
                    // button, so Enter in a field saves rather than previews.
                    <Button
                      type="button"
                      variant="outline"
                      disabled={busy}
                      onClick={(e) => {
                        const form = e.currentTarget.form!;
                        if (!dirty) {
                          window.open(previewPath(kind, post.id), "_blank");
                        } else if (form.reportValidity()) {
                          previewTab.current = window.open("", "_blank");
                          form.requestSubmit();
                        }
                      }}
                    >
                      Open preview
                      <ArrowUpRight data-icon="inline-end" />
                    </Button>
                  )}
                  {status === "scheduled" && (
                    <>
                      <PublishPopover
                        trigger={
                          <Button type="button" variant="outline" disabled={busy}>
                            Reschedule
                          </Button>
                        }
                        open={publishOpen}
                        onOpenChange={setPublishOpen}
                        form={formId}
                        scheduledAt={publishedAt}
                        error={state.errors?.publishedAt}
                        disabled={uploads > 0}
                      />
                      <SaveButton
                        intent="unpublish"
                        variant="outline"
                        pendingLabel="Unscheduling…"
                        disabled={uploads > 0}
                      >
                        Unschedule
                      </SaveButton>
                    </>
                  )}
                </div>
              )}
            </div>

            <Field data-invalid={Boolean(state.errors?.slug)}>
              <FieldLabel htmlFor="slug">URL</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <InputGroupText>{readerPath(kind, "")}</InputGroupText>
                </InputGroupAddon>
                <InputGroupInput
                  id="slug"
                  name="slug"
                  required
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  title="Lowercase letters, numbers and single dashes"
                  placeholder={kind === "page" ? "about" : "my-post"}
                  value={slug}
                  aria-invalid={Boolean(state.errors?.slug)}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugEdited(Boolean(post) || e.target.value !== "");
                  }}
                  // The browser can only point out a field it can see.
                  onInvalid={() => flushSync(() => setSettingsOpen(true))}
                />
              </InputGroup>
              {state.errors?.slug ? (
                <FieldError>{state.errors.slug}</FieldError>
              ) : (
                <FieldDescription>
                  {post
                    ? `Changing it breaks existing links to the ${kind}.`
                    : "Filled in from the title. Edit it to choose your own."}
                </FieldDescription>
              )}
            </Field>

            {kind === "post" && <TagField value={tags} onChange={setTags} options={tagOptions} />}

            {kind === "post" && (
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldLabel htmlFor="featured">Feature this post</FieldLabel>
                  <FieldDescription>
                    It leads the home page in place of the newest post. If several are
                    featured, the newest of them does.
                  </FieldDescription>
                </FieldContent>
                <Switch
                  id="featured"
                  name="featured"
                  checked={featured}
                  onCheckedChange={setFeatured}
                />
              </Field>
            )}

            <FeatureImageField
              kind={kind}
              image={featureImage}
              alt={featureImageAlt}
              onImageChange={setFeatureImage}
              onAltChange={setFeatureImageAlt}
              upload={upload}
            />

            {post && (
              <div className="-mx-5 mt-auto border-t px-3 pt-4">
                <DeletePostButton kind={kind} id={post.id} title={post.title} />
              </div>
            )}
          </aside>
        </div>
      </Tabs>
    </form>
  );
}

function DeletePostButton({ kind, id, title }: { kind: PostKind; id: number; title: string }) {
  const [deleting, startDeleting] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          />
        }
      >
        <Trash2 data-icon="inline-start" />
        Delete {kind}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this {kind}?</AlertDialogTitle>
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
            {deleting ? "Deleting…" : `Delete ${kind}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
