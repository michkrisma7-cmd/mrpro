"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import type { TeamMember } from "@prisma/client";
import "./team-profiles.css";

type PublicMember = Pick<
  TeamMember,
  | "id"
  | "name"
  | "expertise"
  | "experience"
  | "description"
  | "fullProfile"
  | "photoId"
>;

export function TeamProfiles({ members }: { members: PublicMember[] }) {
  const [selected, setSelected] = useState<PublicMember | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (dialog.current && !dialog.current.open) dialog.current.showModal();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selected]);
  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const elements = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );
    const first = elements[0],
      last = elements[elements.length - 1];
    if (!first || !last) {
      event.preventDefault();
      event.currentTarget.focus();
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
  function close() {
    dialog.current?.close();
  }
  function onClose() {
    setSelected(null);
    trigger.current?.focus();
  }
  return (
    <>
      <div className="team-profile-grid">
        {members.map((member) => (
          <article className="team-profile-card" key={member.id}>
            <Image
              className="team-profile-photo"
              src={`/api/media/${member.photoId}`}
              alt={`Foto ${member.name}`}
              width={120}
              height={140}
              sizes="(max-width: 700px) 100px, 120px"
              loading="lazy"
            />
            <div className="team-profile-info">
              <h2>{member.name}</h2>
              <p className="team-profile-expertise">{member.expertise}</p>
              {member.experience && (
                <p className="team-profile-experience">{member.experience}</p>
              )}
              {member.description && (
                <p className="team-profile-summary">{member.description}</p>
              )}
            </div>
            <button
              type="button"
              className="team-profile-trigger"
              aria-label={`Lihat profil ${member.name}`}
              aria-haspopup="dialog"
              aria-controls="team-profile-dialog"
              onClick={(event) => {
                trigger.current = event.currentTarget;
                setSelected(member);
              }}
            />
          </article>
        ))}
      </div>
      {selected && (
        <dialog
          ref={dialog}
          id="team-profile-dialog"
          className="team-profile-dialog"
          aria-labelledby="team-profile-dialog-title"
          onClose={onClose}
          onKeyDown={trapFocus}
          tabIndex={-1}
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          onClick={(event) => {
            if (event.target !== event.currentTarget) return;
            const box = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < box.left ||
              event.clientX > box.right ||
              event.clientY < box.top ||
              event.clientY > box.bottom
            )
              close();
          }}
        >
          <div className="team-profile-dialog-header">
            <h2 id="team-profile-dialog-title">Profil {selected.name}</h2>
            <button
              type="button"
              className="icon-button"
              aria-label="Tutup profil"
              onClick={close}
              autoFocus
            >
              <X size={22} aria-hidden="true" />
            </button>
          </div>
          <div className="team-profile-dialog-body">
            <Image
              className="team-profile-dialog-photo"
              src={`/api/media/${selected.photoId}`}
              alt={`Foto profil ${selected.name}`}
              width={320}
              height={374}
              sizes="(max-width: 700px) 240px, 280px"
              loading="lazy"
            />
            <div className="team-profile-dialog-info">
              <h3>{selected.name}</h3>
              <p className="team-profile-expertise">{selected.expertise}</p>
              {selected.experience && (
                <p className="team-profile-experience">{selected.experience}</p>
              )}
              {selected.description && (
                <section>
                  <h4>Deskripsi singkat</h4>
                  <p>{selected.description}</p>
                </section>
              )}
              {selected.fullProfile && (
                <section>
                  <h4>Profil lengkap</h4>
                  <p>{selected.fullProfile}</p>
                </section>
              )}
            </div>
          </div>
        </dialog>
      )}
    </>
  );
}
