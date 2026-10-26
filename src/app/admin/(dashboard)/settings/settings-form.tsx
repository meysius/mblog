"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useActionState, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { joinLines } from "@/lib/excerpt";
import {
  NAV_LABEL_MAX_LENGTH,
  NAV_URL_MAX_LENGTH,
  type NavLink,
  oneLine,
  SITE_DESCRIPTION_MAX_LENGTH,
  SITE_TITLE_MAX_LENGTH,
  type SiteSettings,
} from "@/lib/site-settings";
import { type NavLinkErrors, saveSettings, type SettingsFormState } from "../../settings-actions";

const initialState: SettingsFormState = {};

// A header link as the form edits it. The id keeps each row's fields and errors
// together as rows move.
type LinkRow = NavLink & { id: number; errors?: NavLinkErrors | null };

const isEmpty = (link: NavLink) => !link.label.trim() && !link.url.trim();

// The links as a save stores them, for telling whether anything changed.
function asSaved(links: NavLink[]) {
  return JSON.stringify(
    links.filter((link) => !isEmpty(link)).map(({ label, url }) => [oneLine(label), url.trim()]),
  );
}

export function SettingsForm({ settings }: { settings: SiteSettings }) {
  const [state, formAction, pending] = useActionState(saveSettings, initialState);
  const [title, setTitle] = useState(settings.title);
  const [description, setDescription] = useState(settings.description);
  const [links, setLinks] = useState<LinkRow[]>(() =>
    settings.navigation.map((link, id) => ({ ...link, id })),
  );
  const nextId = useRef(settings.navigation.length);
  // The row just added, so its label field takes focus.
  const [addedId, setAddedId] = useState<number>();
  const errors = state.errors ?? {};

  // Errors come back by position; each row keeps its own from then on. A save
  // skips empty rows, so they leave the form too.
  const [seenState, setSeenState] = useState(state);
  if (state !== seenState) {
    setSeenState(state);
    setLinks(
      state.savedAt
        ? links.filter((link) => !isEmpty(link)).map((link) => ({ ...link, errors: null }))
        : links.map((link, i) => ({ ...link, errors: state.errors?.navigation?.[i] })),
    );
  }

  function updateLink(id: number, change: Partial<NavLink>) {
    setLinks(links.map((link) => (link.id === id ? { ...link, ...change } : link)));
  }

  function moveLink(from: number, to: number) {
    const moved = [...links];
    moved.splice(to, 0, ...moved.splice(from, 1));
    setLinks(moved);
  }

  function addLink() {
    const id = nextId.current++;
    setLinks([...links, { id, label: "", url: "" }]);
    setAddedId(id);
  }

  // The page re-renders with the saved settings after a save, so this clears once it lands.
  const dirty =
    oneLine(title) !== settings.title ||
    description.trim() !== settings.description ||
    asSaved(links) !== asSaved(settings.navigation);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-10">
      <div className="flex flex-col gap-6">
        <Field data-invalid={Boolean(errors.title)}>
          <FieldLabel htmlFor="title">Title</FieldLabel>
          <Input
            id="title"
            name="title"
            required
            maxLength={SITE_TITLE_MAX_LENGTH}
            value={title}
            aria-invalid={Boolean(errors.title)}
            onChange={(e) => setTitle(e.target.value)}
          />
          {errors.title ? (
            <FieldError>{errors.title}</FieldError>
          ) : (
            <FieldDescription>
              At the top of every page, and in browser tabs and the RSS feed.
            </FieldDescription>
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor="description">Description</FieldLabel>
          <Textarea
            id="description"
            name="description"
            rows={3}
            maxLength={SITE_DESCRIPTION_MAX_LENGTH}
            value={description}
            aria-describedby="description-hint"
            onChange={(e) => setDescription(joinLines(e.target.value))}
          />
          <FieldDescription id="description-hint" className="flex justify-between gap-4">
            <span>Shown in search results, share previews and the RSS feed.</span>
            <span className="tabular-nums">
              {description.length}/{SITE_DESCRIPTION_MAX_LENGTH}
            </span>
          </FieldDescription>
        </Field>
      </div>

      <FieldSet>
        <div>
          <FieldLegend>Navigation</FieldLegend>
          <FieldDescription>
            Links in the site’s header, in this order. Link to a page on this site with its path,
            like /about, or to anywhere else with its full address.
          </FieldDescription>
        </div>

        {/* On phones a link's fields stack, so links need more room between them. */}
        {links.length > 0 && (
          <ol className="flex flex-col gap-5 sm:gap-3">
            {links.map((link, i) => (
              <li key={link.id} className="flex items-start gap-2">
                <div className="grid flex-1 gap-2 sm:grid-cols-[2fr_3fr]">
                  <div className="flex flex-col gap-1.5">
                    <Input
                      name="navLabel"
                      aria-label={`Link ${i + 1} label`}
                      placeholder="Label"
                      autoFocus={link.id === addedId}
                      maxLength={NAV_LABEL_MAX_LENGTH}
                      value={link.label}
                      aria-invalid={Boolean(link.errors?.label)}
                      onChange={(e) => updateLink(link.id, { label: e.target.value })}
                    />
                    {link.errors?.label && <FieldError>{link.errors.label}</FieldError>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Input
                      name="navUrl"
                      aria-label={`Link ${i + 1} URL`}
                      placeholder="/about"
                      maxLength={NAV_URL_MAX_LENGTH}
                      value={link.url}
                      aria-invalid={Boolean(link.errors?.url)}
                      onChange={(e) => updateLink(link.id, { url: e.target.value })}
                    />
                    {link.errors?.url && <FieldError>{link.errors.url}</FieldError>}
                  </div>
                </div>
                <div className="flex text-muted-foreground">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Move link ${i + 1} up`}
                    disabled={i === 0}
                    onClick={() => moveLink(i, i - 1)}
                  >
                    <ArrowUp />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Move link ${i + 1} down`}
                    disabled={i === links.length - 1}
                    onClick={() => moveLink(i, i + 1)}
                  >
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove link ${i + 1}`}
                    onClick={() => setLinks(links.filter((other) => other.id !== link.id))}
                  >
                    <X />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}

        <Button type="button" variant="outline" className="self-start" onClick={addLink}>
          <Plus data-icon="inline-start" />
          Add link
        </Button>
      </FieldSet>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <span aria-live="polite" className="text-sm text-muted-foreground">
          {dirty ? "Unsaved changes" : state.savedAt ? "Saved" : null}
        </span>
      </div>
    </form>
  );
}
