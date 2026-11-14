"use client";
import { useState } from "react";
import { Play } from "lucide-react";
import { isYoutubeVideoId } from "@/lib/youtube";

export function PropertyVideo({
  videoId,
  title,
}: {
  videoId: string;
  title: string;
}) {
  const [active, setActive] = useState(false);
  if (!isYoutubeVideoId(videoId)) return null;
  return (
    <section className="detail-section property-video">
      <h2>Video properti</h2>
      <div className="property-video-player">
        {active ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
            title={`Video properti: ${title}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            onClick={() => setActive(true)}
            aria-label={`Putar video properti: ${title}`}
          >
            <Play size={32} aria-hidden="true" />
            <span>Putar video properti</span>
          </button>
        )}
      </div>
    </section>
  );
}
