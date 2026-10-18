"use client";
import { useActionState } from "react";
import type { BlogPost } from "@prisma/client";
import { saveBlogPost } from "@/lib/blog-actions";
import { FormMessage, SubmitButton } from "./form-status";
export function BlogEditor({
  post,
  disabled,
}: {
  post?: BlogPost;
  disabled: boolean;
}) {
  const [state, action] = useActionState(saveBlogPost, {});
  return (
    <form action={action} className="admin-edit-form">
      <fieldset disabled={disabled} className="plain-fieldset">
        <input type="hidden" name="id" value={post?.id || ""} />
        <div className="form-grid">
          <label>
            Judul
            <input
              name="title"
              required
              minLength={3}
              maxLength={160}
              defaultValue={post?.title}
            />
          </label>
          <label>
            Slug
            <input
              name="slug"
              maxLength={180}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              defaultValue={post?.slug}
              placeholder="tips-memilih-rumah"
            />
            <small>Kosongkan untuk membuat slug otomatis dari judul.</small>
          </label>
        </div>
        <label>
          Ringkasan
          <textarea
            name="excerpt"
            required
            minLength={10}
            maxLength={350}
            rows={3}
            defaultValue={post?.excerpt}
          />
        </label>
        <label>
          Isi artikel
          <textarea
            name="content"
            required
            minLength={20}
            maxLength={50000}
            rows={16}
            defaultValue={post?.content}
          />
          <small>
            Gunakan teks biasa. Pisahkan paragraf dengan baris kosong.
          </small>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="published"
            defaultChecked={post?.published}
          />{" "}
          Terbitkan di website (hapus centang untuk menyimpan sebagai draf)
        </label>
        <FormMessage state={state} />
        <SubmitButton disabled={disabled}>Simpan Artikel</SubmitButton>
      </fieldset>
    </form>
  );
}
