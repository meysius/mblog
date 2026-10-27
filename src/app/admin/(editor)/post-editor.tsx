"use client";

import { ArrowLeft, ArrowUpRight, Eye, ImagePlus, PanelRight, PenLine, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  startTransition,
  Suspense,
  useActionState,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
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
import {
  editorPath,
  listPath,
  type PostKind,
  previewPath,
  readerPath,
  RESERVED_PAGE_SLUGS,
} from "@/lib/post-kind";
import type { EditablePost, PostTag } from "@/lib/posts";
import type { RevisionSummary } from "@/lib/revisions";
import { EXCERPT_MAX_LENGTH, joinLines } from "@/lib/excerpt";
import { SLUG_PATTERN, slugify } from "@/lib/slug";
import { cn } from "@/lib/utils";
import { deletePost, type PostFormState } from "../actions";
import { EditorSkeleton } from "./editor-skeleton";
import { FeatureImageField } from "./feature-image-field";
import { HistoryPanel, useVersionHistory, type Version, VersionView } from "./history";
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

// How long drafts wait after a change before saving themselves.
const AUTOSAVE_DELAY = 1500;

// A new post's first save creates it, and the editor at the post's own URL takes
// over. This one hands it what's been written since that save, and which field had
// the caret, so writing carries on across the move.
type Handoff = {
  title: string;
  slug: string;
  slugEdited: boolean;
  body: string;
  excerpt: string;
  featureImage: MediaImage | null;
  featureImageAlt: string;
  tags: string[];
  featured: boolean;
  mode: string;
  settingsOpen: boolean | undefined;
  focus?: { id: string; start: number | null; end: number | null };
  scrollY?: number;
};
const handoffs = new Map<number, Handoff>();

const holdState = async (state: PostFormState) => state;

/**
 * The edit pages' loading state: a skeleton, or, when a new post's editor has
 * just handed off to the page, an editor standing in until the page loads, so
 * there's no moment without one to type in.
 */
export function EditorFallback({ kind }: { kind: PostKind }) {
  // The post's id is in the URL, which prerendering doesn't know, so it renders the skeleton.
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <StandInEditor kind={kind} />
    </Suspense>
  );
}

function StandInEditor({ kind }: { kind: PostKind }) {
  const id = Number(useParams<{ id: string }>().id);
  return handoffs.has(id) ? (
    <PostEditor kind={kind} standInFor={id} action={holdState} />
  ) : (
    <EditorSkeleton />
  );
}

type PostEditorProps = {
  /** Pages have no tags, and are at /<slug> rather than /posts/<slug>. */
  kind: PostKind;
  /** The saved post or page when editing; omitted for a new one. */
  post?: EditablePost;
  /** Every saved tag, for the tag field to suggest. Posts only. */
  tagOptions?: PostTag[];
  /** The saved post's earlier versions, newest first. */
  revisions?: RevisionSummary[];
  /** Set by EditorFallback: the post this editor stands in for while its page loads. */
  standInFor?: number;
  action: (state: PostFormState, formData: FormData) => Promise<PostFormState>;
};

export function PostEditor({
  kind,
  post,
  tagOptions = [],
  revisions = [],
  standInFor,
  action,
}: PostEditorProps) {
  const Noun = kind === "page" ? "Page" : "Post";
  const [state, formAction, pending] = useActionState(action, initialState);
  // Set when this editor takes over from a new post's (see Handoff).
  const handoffId = post?.id ?? standInFor;
  const [handoff] = useState(() =>
    handoffId === undefined ? undefined : handoffs.get(handoffId),
  );
  const [title, setTitle] = useState(handoff?.title ?? post?.title ?? "");
  const [slug, setSlug] = useState(handoff?.slug ?? post?.slug ?? "");
  const [body, setBody] = useState(handoff?.body ?? post?.body ?? "");
  const [excerpt, setExcerpt] = useState(handoff?.excerpt ?? post?.excerpt ?? "");
  const status = post?.status ?? "draft";
  // A draft's URL follows its title until it's edited by hand. Once a post is
  // published or scheduled, links to it may be out there, so it keeps its URL.
  const [slugEdited, setSlugEdited] = useState(
    handoff?.slugEdited ??
      (post !== undefined && (post.status !== "draft" || post.slug !== slugify(post.title))),
  );
  const [featureImage, setFeatureImage] = useState(
    handoff ? handoff.featureImage : (post?.featureImage ?? null),
  );
  const [featureImageAlt, setFeatureImageAlt] = useState(
    handoff?.featureImageAlt ?? post?.featureImageAlt ?? "",
  );
  const savedTags = post?.tags.map((tag) => tag.name) ?? [];
  const [tags, setTags] = useState(handoff?.tags ?? savedTags);
  // "write" or "preview": the post as readers will see it, unsaved changes included.
  const [mode, setMode] = useState(handoff?.mode ?? "write");
  const publishedAt = post?.publishedAt ?? null;
  const [featured, setFeatured] = useState(handoff?.featured ?? post?.featured ?? false);
  // Publishing a post asks whether it goes live now or later (publish-popover.tsx).
  const [publishOpen, setPublishOpen] = useState(false);
  const hydrated = useHydrated();
  const formId = useId();

  // Until it's toggled, CSS decides whether the panel shows, so the server render
  // matches every screen size.
  const [settingsOpen, setSettingsOpen] = useState(handoff?.settingsOpen);
  const wide = useSyncExternalStore(
    subscribeToWidth,
    () => window.matchMedia(WIDE).matches,
    () => true,
  );
  const showSettings = settingsOpen ?? wide;
  const settingsId = useId();

  // Everything a save sends, to tell when any of it changes.
  const content = JSON.stringify([
    title,
    slug,
    body,
    excerpt,
    featureImage?.id,
    featureImageAlt,
    tags,
    featured,
  ]);
  // What a save was refused for, so autosave waits for a change rather than retrying.
  const [refusedContent, setRefusedContent] = useState<string>();
  // Set by restoring a version from the history, so the next save keeps the version it
  // replaces even when it's an autosave.
  const [restored, setRestored] = useState(false);

  // Show the fields errors come back for: the title is only in Write, the URL in settings.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    if (state.errors?.title) setMode("write");
    if (state.errors?.slug) setSettingsOpen(true);
    if (state.errors) setRefusedContent(content);
    else setRestored(false);
  }

  // A save that publishes, schedules or reschedules the post closes the popover.
  const [seenPublishedAt, setSeenPublishedAt] = useState(publishedAt?.getTime());
  if (publishedAt?.getTime() !== seenPublishedAt) {
    setSeenPublishedAt(publishedAt?.getTime());
    setPublishOpen(false);
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

  // Anything written in a new post, or any change to a saved one. The action
  // refreshes `post` after a save, so this clears once the save lands.
  const dirty =
    post === undefined
      ? Boolean(title.trim() || body.trim() || excerpt.trim() || featureImage || tags.length)
      : title.trim() !== post.title ||
        slug.trim() !== post.slug ||
        body !== post.body ||
        excerpt.trim() !== post.excerpt ||
        (featureImage?.id ?? null) !== (post.featureImage?.id ?? null) ||
        featureImageAlt.trim() !== post.featureImageAlt ||
        tags.join("\n") !== savedTags.join("\n") ||
        featured !== post.featured;

  // Drafts save themselves a moment after each change, once they have what a save
  // needs. Published and scheduled posts wait for Update, since readers see their
  // changes.
  const formRef = useRef<HTMLFormElement>(null);
  const createdId = state.createdId;
  const canAutosave =
    status === "draft" &&
    uploads === 0 &&
    !createdId &&
    standInFor === undefined &&
    title.trim() !== "" &&
    SLUG_PATTERN.test(slug.trim()) &&
    !(kind === "page" && RESERVED_PAGE_SLUGS.includes(slug.trim()));
  function autosaveNow() {
    const data = new FormData(formRef.current!);
    // Autosaves keep a version every so often rather than each time (src/lib/revisions.ts).
    if (!restored) data.set("autosave", "1");
    startTransition(() => formAction(data));
  }
  const onAutosaveDue = useEffectEvent(autosaveNow);
  const autosaveDue = canAutosave && dirty && !pending && content !== refusedContent;
  useEffect(() => {
    if (!autosaveDue) return;
    const timer = setTimeout(onAutosaveDue, AUTOSAVE_DELAY);
    return () => clearTimeout(timer);
  }, [autosaveDue, content]);

  // Changes that aren't saved yet would be lost by leaving.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Cmd+S or Ctrl+S saves, like the Save draft or Update button.
  useEffect(() => {
    const save = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", save);
    return () => window.removeEventListener("keydown", save);
  }, []);

  // Once a new post's first save creates it, move to its URL (see Handoff). An
  // editor standing in for it there hands off again once the page loads.
  const router = useRouter();
  const handingOffTo = createdId ?? standInFor;
  useEffect(() => {
    if (handingOffTo === undefined) return;
    handoffs.set(handingOffTo, {
      title,
      slug,
      slugEdited,
      body,
      excerpt,
      featureImage,
      featureImageAlt,
      tags,
      featured,
      mode,
      settingsOpen,
    });
  });
  useEffect(() => {
    if (createdId) router.replace(editorPath(kind, createdId), { scroll: false });
  }, [createdId, kind, router]);
  // The caret's place is read as this editor goes, since moving it doesn't re-render.
  useLayoutEffect(() => {
    if (handingOffTo === undefined) return;
    return () => {
      const handoff = handoffs.get(handingOffTo);
      if (!handoff) return;
      const field = document.activeElement;
      if ((field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) && field.id) {
        handoff.focus = { id: field.id, start: field.selectionStart, end: field.selectionEnd };
      }
      handoff.scrollY = window.scrollY;
    };
  }, [handingOffTo]);
  // And this is the editor taking over.
  const postId = post?.id;
  useLayoutEffect(() => {
    if (!handoff) return;
    if (postId !== undefined) handoffs.delete(postId);
    if (handoff.scrollY !== undefined) window.scrollTo(0, handoff.scrollY);
    const field = handoff.focus && document.getElementById(handoff.focus.id);
    if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
      field.focus({ preventScroll: true });
      field.setSelectionRange(handoff.focus!.start, handoff.focus!.end);
    }
  }, [handoff, postId]);


  // History slides into the settings panel, and the version picked shows in the
  // editor's place (history.tsx).
  const [historyOpen, setHistoryOpen] = useState(false);
  const history = useVersionHistory();
  const historyBack = useRef<HTMLButtonElement>(null);
  const viewHistory = useRef<HTMLButtonElement>(null);
  function openHistory() {
    // The newest earlier version is the likeliest one wanted.
    history.select(revisions[0]?.id ?? "current");
    flushSync(() => setHistoryOpen(true));
    historyBack.current?.focus({ preventScroll: true });
  }
  function closeHistory() {
    flushSync(() => setHistoryOpen(false));
    viewHistory.current?.focus({ preventScroll: true });
  }
  useEffect(() => {
    if (!historyOpen) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeHistory();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  });

  function restore(version: Version) {
    setTitle(version.title);
    if (!slugEdited) setSlug(slugify(version.title));
    setExcerpt(version.excerpt);
    setBody(version.body);
    setFeatureImage(version.featureImage);
    setFeatureImageAlt(version.featureImageAlt);
    setMode("write");
    setRestored(true);
    setHistoryOpen(false);
  }

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
  const currentVersion: Version = {
    title: title.trim(),
    excerpt: excerpt.trim(),
    body,
    featureImage,
    featureImageAlt: featureImageAlt.trim(),
  };
  const selectedRevision = revisions.find(({ id }) => id === history.selected);
  // The tags as the post shows them. A new tag's URL is settled when it's saved;
  // slugify is a close guess.
  const articleTags = tags.map((name) => ({
    name,
    slug: tagOptions.find((tag) => tag.name === name)?.slug ?? slugify(name),
  }));

  return (
    <form ref={formRef} id={formId} action={formAction} className="flex flex-1 flex-col">
      <Tabs value={mode} onValueChange={setMode} className="flex-1 gap-0">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur sm:px-4 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={listPath(kind)}
              className={cn(buttonVariants({ variant: "ghost" }), "text-muted-foreground")}
              onClick={(e) => {
                // A draft saves its changes on the way out; anything else asks first.
                // Not while a new post moves to its URL, which its first save just made.
                if (!dirty || handingOffTo !== undefined) return;
                if (canAutosave) autosaveNow();
                else if (!window.confirm("Leave without saving your changes?")) e.preventDefault();
              }}
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
                  : pending
                    ? "Saving…"
                    : dirty
                      ? "Unsaved changes"
                      : state.savedAt
                        ? "Saved"
                      : null}
              </span>
            </div>
          </div>

          {/* Writing tools, centered over the page on wider screens. */}
          {historyOpen ? (
            <p className="text-sm font-medium max-md:sr-only">History</p>
          ) : (
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
          )}

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
                    trigger={
                      <Button type="button" disabled={busy}>
                        Publish
                      </Button>
                    }
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
              {historyOpen && (
                <VersionView
                  kind={kind}
                  version={history.selected === "current" ? currentVersion : history.earlier}
                  savedAt={selectedRevision?.savedAt}
                  publishedAt={publishedAt}
                  tags={articleTags}
                  dirty={dirty}
                  onRestore={restore}
                  onExit={() => setHistoryOpen(false)}
                />
              )}
              {/* Hidden rather than unmounted during history, so the fields are still submitted. */}
              <div className={cn(historyOpen && "hidden")}>
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
                        tags: articleTags,
                      }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">Nothing to preview yet.</p>
                  )}
                </TabsContent>
              </div>
            </div>
          </div>

          {/* Always mounted, so its fields are submitted while it's closed. */}
          <aside
            id={settingsId}
            aria-label={`${Noun} settings`}
            className={cn(
              settingsOpen === undefined ? "hidden lg:block" : settingsOpen ? "block" : "hidden",
              "fixed inset-x-0 top-14 bottom-0 z-30 overflow-hidden border-l bg-background shadow-lg sm:left-auto sm:w-80",
              "lg:sticky lg:h-[calc(100svh-3.5rem)] lg:shrink-0 lg:shadow-none",
            )}
          >
            {/* The settings, and beside them the history, which slides over in their place. */}
            <div
              className={cn(
                "flex h-full w-[200%] transition-transform duration-300 ease-out motion-reduce:transition-none",
                historyOpen && "-translate-x-1/2",
              )}
            >
              <div inert={historyOpen} className="flex h-full w-1/2 flex-col gap-7 overflow-y-auto p-5">
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
                        setSlugEdited(status !== "draft" || e.target.value !== "");
                      }}
                      // The browser can only point out a field it can see.
                      onInvalid={() => flushSync(() => setSettingsOpen(true))}
                    />
                  </InputGroup>
                  {state.errors?.slug ? (
                    <FieldError>{state.errors.slug}</FieldError>
                  ) : (
                    <FieldDescription>
                      {status !== "draft"
                        ? `Changing it breaks existing links to the ${kind}.`
                        : slugEdited
                          ? "Readers find it here once it’s published."
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
                  <div className="flex flex-col items-start gap-2">
                    <FieldTitle>History</FieldTitle>
                    <p className="text-sm text-muted-foreground">
                      {revisions.length === 0
                        ? "Each save keeps the version it replaces, to look back on here."
                        : `${revisions.length} earlier ${revisions.length === 1 ? "version" : "versions"}.`}
                    </p>
                    <Button
                      ref={viewHistory}
                      type="button"
                      variant="outline"
                      disabled={revisions.length === 0}
                      onClick={openHistory}
                    >
                      View history
                    </Button>
                  </div>
                )}

                {post && (
                  <div className="-mx-5 mt-auto border-t px-3 pt-4">
                    <DeletePostButton kind={kind} id={post.id} title={post.title} />
                  </div>
                )}
              </div>

              <div inert={!historyOpen} className="h-full w-1/2 overflow-y-auto p-5">
                {post && (
                  <HistoryPanel
                    revisions={revisions}
                    current={currentVersion}
                    dirty={dirty}
                    selected={history.selected}
                    onSelect={(id) => {
                      history.select(id);
                      // Where the panel covers the page, it gets out of the way of the version.
                      if (!wide) setSettingsOpen(false);
                    }}
                    onBack={closeHistory}
                    backRef={historyBack}
                  />
                )}
              </div>
            </div>
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
