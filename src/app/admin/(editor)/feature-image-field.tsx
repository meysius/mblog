"use client";

import { ImagePlus, LoaderCircle } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { IMAGE_TYPES, mediaSrc, type MediaImage } from "@/lib/media";
import type { PostKind } from "@/lib/post-kind";

type FeatureImageFieldProps = {
  kind: PostKind;
  image: MediaImage | null;
  alt: string;
  onImageChange: (image: MediaImage | null) => void;
  onAltChange: (alt: string) => void;
  upload: (file: File) => Promise<MediaImage>;
};

export function FeatureImageField({
  kind,
  image,
  alt,
  onImageChange,
  onAltChange,
  upload,
}: FeatureImageFieldProps) {
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
      onImageChange(await upload(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const choose = () => fileInput.current?.click();

  return (
    <div
      className="flex flex-col gap-3"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) e.preventDefault();
      }}
      onDrop={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        add(e.dataTransfer.files[0]);
      }}
    >
      <FieldTitle>Feature image</FieldTitle>
      <input type="hidden" name="featureImageId" value={image?.id ?? ""} />
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

      {image ? (
        <>
          <div className="relative">
            <Image
              src={mediaSrc(image.url)}
              width={image.width}
              height={image.height}
              alt=""
              // The settings panel: full width on phones, 20rem with 1.25rem padding beyond.
              sizes="(min-width: 40rem) 17.5rem, 100vw"
              className="aspect-video w-full rounded-lg border bg-muted object-cover"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/70">
                <LoaderCircle className="size-5 animate-spin" aria-label="Uploading" />
              </div>
            )}
          </div>
          <div className="-mx-2 flex gap-1">
            <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={choose}>
              Replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={uploading}
              className="text-muted-foreground"
              onClick={() => {
                onImageChange(null);
                onAltChange("");
              }}
            >
              Remove
            </Button>
          </div>
          {error && <FieldError>{error}</FieldError>}
          <Field>
            <FieldLabel htmlFor="feature-image-alt">Alt text</FieldLabel>
            <Input
              id="feature-image-alt"
              name="featureImageAlt"
              placeholder="Describe the image"
              value={alt}
              onChange={(e) => onAltChange(e.target.value)}
            />
            <FieldDescription>For readers who can’t see the image.</FieldDescription>
          </Field>
        </>
      ) : (
        <>
          <button
            type="button"
            disabled={uploading}
            onClick={choose}
            className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-sm text-muted-foreground transition-colors outline-none hover:bg-muted/50 hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none"
          >
            {uploading ? (
              <>
                <LoaderCircle className="size-5 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <ImagePlus className="size-5" />
                Add feature image
              </>
            )}
          </button>
          {error ? (
            <FieldError>{error}</FieldError>
          ) : (
            <FieldDescription>
              Shown at the top of the {kind}. You can also drop one here.
            </FieldDescription>
          )}
        </>
      )}
    </div>
  );
}
