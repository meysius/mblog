"use client";

import { ImagePlus, LoaderCircle } from "lucide-react";
import Image from "next/image";
import { type ReactNode, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldError, FieldTitle } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { IMAGE_TYPES, mediaSrc, type MediaImage, type MediaKind, uploadImage } from "@/lib/media";

type ImageFieldProps = {
  label: string;
  // The hidden input that submits the image's id, or nothing when there's none.
  name: string;
  image: MediaImage | null;
  onChange: (image: MediaImage | null) => void;
  kind?: MediaKind;
  // The preview's shape, as the site shows the image.
  previewClassName?: string;
  description?: ReactNode;
};

/** An image in the settings, such as the intro photo. It uploads when chosen; saving the form keeps it. */
export function ImageField({
  label,
  name,
  image,
  onChange,
  kind,
  previewClassName,
  description,
}: ImageFieldProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("That file isn’t an image.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      onChange(await uploadImage(file, kind));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <FieldTitle>{label}</FieldTitle>
      <input type="hidden" name={name} value={image?.id ?? ""} />
      <input
        ref={fileInput}
        type="file"
        accept={IMAGE_TYPES}
        hidden
        onChange={(e) => {
          add(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "relative flex size-16 shrink-0 items-center justify-center overflow-hidden border bg-muted text-muted-foreground",
            previewClassName,
          )}
        >
          {image ? (
            <Image
              src={mediaSrc(image.url)}
              width={image.width}
              height={image.height}
              alt=""
              sizes="4rem"
              className="size-full object-cover"
            />
          ) : (
            <ImagePlus className="size-5" />
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-foreground">
              <LoaderCircle className="size-5 animate-spin" aria-label="Uploading" />
            </div>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInput.current?.click()}
          >
            {image ? "Replace" : `Upload ${label.toLowerCase()}`}
          </Button>
          {image && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              className="text-muted-foreground"
              onClick={() => onChange(null)}
            >
              Remove
            </Button>
          )}
        </div>
      </div>
      {error ? (
        <FieldError>{error}</FieldError>
      ) : (
        description && <FieldDescription>{description}</FieldDescription>
      )}
    </div>
  );
}
