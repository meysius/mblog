"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
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
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import { joinLines } from "@/lib/excerpt";
import { formatPostCount } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { TAG_DESCRIPTION_MAX_LENGTH, TAG_NAME_MAX_LENGTH } from "@/lib/tag-name";
import type { EditableTag } from "@/lib/tags";
import { deleteTag, type TagFormState } from "../../tag-actions";

const initialState: TagFormState = {};

type TagFormProps = {
  /** The saved tag when editing; omitted for a new tag. */
  tag?: EditableTag;
  action: (state: TagFormState, formData: FormData) => Promise<TagFormState>;
};

export function TagForm({ tag, action }: TagFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [name, setName] = useState(tag?.name ?? "");
  const [slug, setSlug] = useState(tag?.slug ?? "");
  // A new tag's URL follows its name until it's edited by hand. Saved tags keep theirs.
  const [slugEdited, setSlugEdited] = useState(Boolean(tag));
  const [description, setDescription] = useState(tag?.description ?? "");
  const errors = state.errors ?? {};

  // The action refreshes `tag` after a save, so this clears once the save lands.
  const dirty =
    tag !== undefined &&
    (name.trim() !== tag.name ||
      slug.trim() !== tag.slug ||
      description.trim() !== tag.description);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-6">
      <Field data-invalid={Boolean(errors.name)}>
        <FieldLabel htmlFor="name">Name</FieldLabel>
        <Input
          id="name"
          name="name"
          required
          autoFocus={!tag}
          maxLength={TAG_NAME_MAX_LENGTH}
          value={name}
          aria-invalid={Boolean(errors.name)}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugEdited) setSlug(slugify(e.target.value));
          }}
        />
        {errors.name && <FieldError>{errors.name}</FieldError>}
      </Field>

      <Field data-invalid={Boolean(errors.slug)}>
        <FieldLabel htmlFor="slug">URL</FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>/tags/</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            id="slug"
            name="slug"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            title="Lowercase letters, numbers and single dashes"
            value={slug}
            aria-invalid={Boolean(errors.slug)}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugEdited(Boolean(tag) || e.target.value !== "");
            }}
          />
        </InputGroup>
        {errors.slug ? (
          <FieldError>{errors.slug}</FieldError>
        ) : (
          <FieldDescription>
            {tag
              ? "Changing it breaks existing links to the tag’s page."
              : "Filled in from the name. Edit it to choose your own."}
          </FieldDescription>
        )}
      </Field>

      <Field>
        <FieldLabel htmlFor="description">Description</FieldLabel>
        <Textarea
          id="description"
          name="description"
          rows={3}
          maxLength={TAG_DESCRIPTION_MAX_LENGTH}
          value={description}
          aria-describedby="description-hint"
          onChange={(e) => setDescription(joinLines(e.target.value))}
        />
        <FieldDescription id="description-hint" className="flex justify-between gap-4">
          <span>Shown on the tag’s page and in search results.</span>
          <span className="tabular-nums">
            {description.length}/{TAG_DESCRIPTION_MAX_LENGTH}
          </span>
        </FieldDescription>
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : tag ? "Save" : "Create tag"}
        </Button>
        <span aria-live="polite" className="text-sm text-muted-foreground">
          {dirty ? "Unsaved changes" : state.savedAt ? "Saved" : null}
        </span>
      </div>
    </form>
  );
}

export function DeleteTagButton({ tag }: { tag: EditableTag }) {
  const [deleting, startDeleting] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            // Lines the label up with the form above.
            className="-ml-2.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
          />
        }
      >
        <Trash2 data-icon="inline-start" />
        Delete tag
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this tag?</AlertDialogTitle>
          <AlertDialogDescription>
            {tag.postCount > 0
              ? `${formatPostCount(tag.postCount)} will lose the tag “${tag.name}” and keep everything else. This can’t be undone.`
              : `No posts have “${tag.name}”. This can’t be undone.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={deleting}
            onClick={() => startDeleting(() => deleteTag(tag.id))}
          >
            {deleting ? "Deleting…" : "Delete tag"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
