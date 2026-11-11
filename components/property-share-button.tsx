"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Share2 } from "lucide-react";
import type { ListingShare } from "@/lib/listing-share";

const PropertyShareModal = dynamic(() => import("./property-share-modal"));

export function PropertyShareButton({ listing }: { listing: ListingShare }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="property-share-button"
        aria-label={`Bagikan ${listing.title}`}
        aria-haspopup="dialog"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        Bagikan <Share2 size={15} aria-hidden="true" />
      </button>
      {open && (
        <PropertyShareModal
          key={listing.slug}
          listing={listing}
          returnFocusRef={trigger}
          onClose={() => {
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
