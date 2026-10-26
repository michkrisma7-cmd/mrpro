"use client";
import { useActionState, useState } from "react";
import { savePropertyPhotos } from "@/lib/actions";
import { PropertyPhotos } from "./property-photos";
import { FormMessage, SubmitButton } from "./form-status";

export function PropertyPhotoEditor({
  id,
  gallery,
  uploadEnabled,
}: {
  id: string;
  gallery: string[];
  uploadEnabled: boolean;
}) {
  const [state, action] = useActionState(savePropertyPhotos, {});
  const [ready, setReady] = useState(gallery.length > 0);
  return (
    <form action={action} className="property-form">
      <input type="hidden" name="id" value={id} />
      <PropertyPhotos
        initialGallery={gallery}
        enabled={uploadEnabled}
        onReady={setReady}
      />
      <FormMessage state={state} />
      <SubmitButton disabled={!ready}>Simpan foto properti</SubmitButton>
    </form>
  );
}
