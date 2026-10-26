"use client";

import { Plus } from "lucide-react";
import { useId, useRef, useState } from "react";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { FieldDescription, FieldLabel } from "@/components/ui/field";
import type { PostTag } from "@/lib/posts";
import { cleanTagName, sameTagName, TAG_NAME_MAX_LENGTH } from "@/lib/tag-name";

type TagFieldProps = {
  /** The post's tag names, in order. */
  value: string[];
  onChange: (names: string[]) => void;
  /** Every saved tag, suggested while typing. */
  options: PostTag[];
};

export function TagField({ value, onChange, options }: TagFieldProps) {
  const id = useId();
  const anchor = useComboboxAnchor();
  const [query, setQuery] = useState("");
  const highlighted = useRef<string>(undefined);

  const names = options.map((tag) => tag.name);
  const known = [...names, ...value];
  // A name typed in another case is the same tag, spelled the way it already is.
  const spelling = (name: string) => known.find((other) => sameTagName(other, name)) ?? name;
  const typed = cleanTagName(query);
  // A name that isn't a tag yet is offered last, to add as a new tag.
  const isNew = typed !== "" && !known.some((other) => sameTagName(other, typed));
  const items = isNew ? [...names, typed] : names;

  function add(name: string) {
    const tag = spelling(name);
    if (!value.includes(tag)) onChange([...value, tag]);
    setQuery("");
  }

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={id}>Tags</FieldLabel>
      {value.map((name) => (
        <input key={name} type="hidden" name="tags" value={name} />
      ))}
      <Combobox
        multiple
        autoHighlight
        items={items}
        value={value}
        onValueChange={(next: string[]) => {
          onChange(next);
          setQuery("");
        }}
        inputValue={query}
        onInputValueChange={setQuery}
        onItemHighlighted={(item: string | undefined) => (highlighted.current = item)}
      >
        <ComboboxChips ref={anchor}>
          <ComboboxValue>
            {(selected: string[]) => (
              <>
                {selected.map((name) => (
                  <ComboboxChip key={name} removeLabel={`Remove ${name}`}>
                    {name}
                  </ComboboxChip>
                ))}
                <ComboboxChipsInput
                  id={id}
                  maxLength={TAG_NAME_MAX_LENGTH}
                  placeholder={selected.length > 0 ? undefined : "Add tags"}
                  onKeyDown={(e) => {
                    // Enter with no suggestion picked adds what's typed, rather than
                    // saving the post. A comma always does.
                    const enter = e.key === "Enter" && !highlighted.current;
                    if (typed && !e.nativeEvent.isComposing && (enter || e.key === ",")) {
                      e.preventDefault();
                      add(typed);
                    }
                  }}
                />
              </>
            )}
          </ComboboxValue>
        </ComboboxChips>
        <ComboboxContent anchor={anchor}>
          <ComboboxEmpty>Type a name to add a tag.</ComboboxEmpty>
          <ComboboxList>
            {(name: string) => (
              <ComboboxItem key={name} value={name}>
                {isNew && name === typed ? (
                  <>
                    <Plus className="text-muted-foreground" />
                    <span className="truncate">Add “{name}”</span>
                  </>
                ) : (
                  <span className="truncate">{name}</span>
                )}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <FieldDescription>
        Readers can open a tag to see its other posts. New tags are made when you save.
      </FieldDescription>
    </div>
  );
}
