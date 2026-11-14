"use client";
import { useId } from "react";

export function PropertyYoutubeField({ videoId }: { videoId?: string | null }) {
  const helpId = useId();
  return (
    <label>
      Link YouTube (opsional)
      <input
        name="youtubeUrl"
        type="text"
        inputMode="url"
        maxLength={2048}
        defaultValue={
          videoId ? `https://www.youtube.com/watch?v=${videoId}` : ""
        }
        placeholder="https://www.youtube.com/watch?v=…"
        aria-describedby={helpId}
      />
      <small id={helpId}>
        Tautan YouTube, youtu.be, atau Shorts. Kosongkan untuk menghapus video.
      </small>
    </label>
  );
}
