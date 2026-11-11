"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import { Link2, Mail, MapPin, Send, X } from "lucide-react";
import {
  listingShareLinks,
  listingShareUrl,
  type ListingShare,
} from "@/lib/listing-share";

function BrandIcon({
  platform,
}: {
  platform: "whatsapp" | "facebook" | "twitter";
}) {
  const paths = {
    whatsapp:
      "M20.5 11.7a8.5 8.5 0 0 1-12.6 7.5L3 20.5l1.3-4.7a8.5 8.5 0 1 1 16.2-4.1Z M8.2 7.8l1.4 2.6-.9 1c.8 1.5 1.9 2.6 3.5 3.3l1-1 2.7 1.3c-.3 1.4-1.1 2-2.4 1.8-3.7-.6-6.7-3.5-7-6.9-.1-1.1.5-1.8 1.7-2.1Z",
    facebook:
      "M14 21v-8h3l.5-4H14V7c0-1.2.4-2 2-2h2V1.5a26 26 0 0 0-3-.2c-3 0-5 1.8-5 5V9H7v4h3v8Z",
    twitter: "m4 3 12 18h4L8 3H4Zm0 18 6.7-8M20 3l-6.7 8",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="19"
      height="19"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <path d={paths[platform]} />
    </svg>
  );
}

export default function PropertyShareModal({
  listing,
  onClose,
  returnFocusRef,
}: {
  listing: ListingShare;
  onClose: () => void;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const copyInput = useRef<HTMLInputElement>(null);
  const copyPending = useRef(false);
  const headingId = useId();
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );
  const [imageFailed, setImageFailed] = useState(false);
  const links = listingShareLinks(listing);
  const url = listingShareUrl(listing.slug);

  useEffect(() => {
    const dialog = dialogRef.current;
    const returnFocus = returnFocusRef.current;
    const overflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      returnFocus?.focus({ preventScroll: true });
    };
  }, [returnFocusRef]);

  useEffect(() => {
    if (copyStatus === "error") {
      copyInput.current?.focus();
      copyInput.current?.select();
    }
  }, [copyStatus]);

  async function copyLink() {
    if (copyPending.current) return;
    copyPending.current = true;
    setCopyStatus("idle");
    try {
      await navigator.clipboard.writeText(url);
      if (dialogRef.current?.open) setCopyStatus("success");
    } catch {
      if (dialogRef.current?.open) {
        setCopyStatus("error");
        // The error field may already be mounted after an earlier failed copy.
        copyInput.current?.focus();
        copyInput.current?.select();
      }
    } finally {
      copyPending.current = false;
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="property-share-modal"
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const targets = event.currentTarget.querySelectorAll<HTMLElement>(
          "button:not(:disabled), a[href], input:not(:disabled)",
        );
        const first = targets[0];
        const last = targets[targets.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
    >
      <header className="property-share-header">
        <h2 id={headingId}>Bagikan</h2>
        <button
          type="button"
          className="property-share-close"
          aria-label="Tutup Bagikan"
          onClick={onClose}
          autoFocus
        >
          <X size={22} aria-hidden="true" />
        </button>
      </header>
      <div className="property-share-summary">
        <div className="property-share-photo">
          <Image
            src={
              imageFailed
                ? "/images/hero.webp"
                : listing.image || "/images/hero.webp"
            }
            alt={listing.title}
            fill
            sizes="80px"
            className="cover"
            onError={() => setImageFailed(true)}
          />
        </div>
        <div>
          <h3>{listing.title}</h3>
          {listing.price && (
            <p className="property-share-price">{listing.price}</p>
          )}
          {listing.location && (
            <p className="property-share-location">
              <MapPin size={13} aria-hidden="true" />
              {listing.location}
            </p>
          )}
        </div>
      </div>
      <div className="property-share-options">
        <button type="button" onClick={() => void copyLink()}>
          <Link2 size={19} aria-hidden="true" />
          Salin Tautan
        </button>
        <a
          href={links.whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          className="share-whatsapp"
        >
          <BrandIcon platform="whatsapp" />
          WhatsApp
        </a>
        <a
          href={links.facebook}
          target="_blank"
          rel="noopener noreferrer"
          className="share-facebook"
        >
          <BrandIcon platform="facebook" />
          Facebook
        </a>
        <a href={links.twitter} target="_blank" rel="noopener noreferrer">
          <BrandIcon platform="twitter" />X / Twitter
        </a>
        <a
          href={links.telegram}
          target="_blank"
          rel="noopener noreferrer"
          className="share-telegram"
        >
          <Send size={19} aria-hidden="true" />
          Telegram
        </a>
        <a href={links.email}>
          <Mail size={19} aria-hidden="true" />
          Email
        </a>
      </div>
      {copyStatus === "success" && (
        <p className="property-share-feedback" role="status">
          Tautan berhasil disalin
        </p>
      )}
      {copyStatus === "error" && (
        <div className="property-share-feedback">
          <p role="alert">
            Tautan belum berhasil disalin. Pilih dan salin tautan berikut secara
            manual.
          </p>
          <label htmlFor={`${headingId}-url`}>Tautan listing</label>
          <input
            ref={copyInput}
            id={`${headingId}-url`}
            value={url}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
      )}
    </dialog>
  );
}
