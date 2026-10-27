"use client";

import { ImagePlus, LoaderCircle } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, FieldTitle } from "@/components/ui/field";
import { IMAGE_TYPES, mediaSrc, type MediaImage, uploadImage } from "@/lib/media";

type IntroPhotoFieldProps = {
  photo: MediaImage | null;
  onChange: (photo: MediaImage | null) => void;
};

/** The intro's photo. It uploads when chosen; saving the form makes it the intro's. */
export function IntroPhotoField({ photo, onChange }: IntroPhotoFieldProps) {
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
      onChange(await uploadImage(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <FieldTitle>Photo</FieldTitle>
      <input type="hidden" name="introPhotoId" value={photo?.id ?? ""} />
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
        <div className="relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-muted text-muted-foreground">
          {photo ? (
            <Image
              src={mediaSrc(photo.url)}
              width={photo.width}
              height={photo.height}
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
            {photo ? "Replace" : "Upload photo"}
          </Button>
          {photo && (
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
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}
