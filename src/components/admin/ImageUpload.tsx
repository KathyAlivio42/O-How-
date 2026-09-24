"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function ImageUpload({
  folder,
  label = "Upload from computer",
  onUploaded,
}: {
  /** Storage path prefix, e.g. a product id ("products/abc123") or a fixed
   * slug for a singleton image like the GCash QR ("settings/gcash-qr"). */
  folder: string;
  label?: string;
  onUploaded: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputId = `upload-${folder.replace(/[^a-zA-Z0-9]/g, "-")}`;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image is too large (max 5MB).");
      return;
    }

    setUploading(true);
    setError(null);

    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `${folder}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    if (uploadError) {
      setError(
        uploadError.message.includes("not found")
          ? "The 'product-images' storage bucket doesn't exist yet — create it in Supabase Storage first (see README)."
          : `Upload failed: ${uploadError.message}`
      );
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    onUploaded(data.publicUrl);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        id={inputId}
      />
      <label
        htmlFor={inputId}
        className="inline-flex items-center gap-1.5 text-xs rounded-lg border border-ink/10 px-3 py-2 text-ink cursor-pointer hover:bg-brand-light"
      >
        <Upload size={14} />
        {uploading ? "Uploading…" : label}
      </label>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
