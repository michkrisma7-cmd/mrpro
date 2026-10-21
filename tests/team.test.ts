import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { teamSchema } from "../lib/team-validation";
const profile = {
  name: "Budi Santoso",
  expertise: "Kelistrikan",
  experience: "Pengalaman 10 tahun.",
  photoId: "clx12345678901234567890123",
  active: true,
};

test("team validates required fields, lengths and uploaded media references", () => {
  assert.equal(teamSchema.safeParse(profile).success, true);
  for (const change of [
    { name: " " },
    { expertise: "" },
    { experience: " " },
    { photoId: "https://example.com/photo.jpg" },
    { photoId: "../private" },
    { experience: "x".repeat(5001) },
  ])
    assert.equal(
      teamSchema.safeParse({ ...profile, ...change }).success,
      false,
    );
});

test("team mutations require admin and reject foreign photos before creating or editing profiles", async () => {
  let admin = false,
    photoAllowed = false,
    writes = 0;
  const paths: string[] = [];
  const actions = {} as {
    saveTeamMember: (
      state: object,
      form: FormData,
    ) => Promise<{ error?: string }>;
    deleteTeamMember: (state: object, form: FormData) => Promise<unknown>;
  };
  runInNewContext(
    ts.transpileModule(await readFile("lib/team-actions.ts", "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports: actions,
      require: (name: string) => {
        if (name === "./team-validation") return { teamSchema };
        if (name === "./auth")
          return {
            requireAdmin: async () => {
              if (!admin) throw Error("denied");
              return { id: "admin" };
            },
          };
        if (name === "./db")
          return {
            db: () => ({
              media: {
                findFirst: async () =>
                  photoAllowed ? { id: profile.photoId } : null,
              },
              teamMember: {
                create: async () => writes++,
                update: async () => writes++,
                delete: async () => writes++,
              },
            }),
          };
        if (name === "next/cache")
          return { revalidatePath: (path: string) => paths.push(path) };
        if (name === "next/navigation")
          return {
            redirect: () => {
              throw Error("redirect");
            },
          };
        throw Error(name);
      },
    },
  );
  const form = new FormData();
  for (const [key, value] of Object.entries(profile))
    if (typeof value === "string") form.set(key, value);
  form.set("active", "on");
  await assert.rejects(actions.saveTeamMember({}, form), /denied/);
  form.set("id", "existing");
  await assert.rejects(actions.saveTeamMember({}, form), /denied/);
  await assert.rejects(actions.deleteTeamMember({}, form), /denied/);
  assert.equal(writes, 0);
  admin = true;
  assert.match(
    (await actions.saveTeamMember({}, form)).error!,
    /Foto tidak valid/,
  );
  assert.equal(writes, 0);
  photoAllowed = true;
  await assert.rejects(actions.saveTeamMember({}, form), /redirect/);
  form.delete("id");
  await assert.rejects(actions.saveTeamMember({}, form), /redirect/);
  form.set("id", "existing");
  await assert.rejects(actions.deleteTeamMember({}, form), /redirect/);
  assert.equal(writes, 3);
  assert.ok(paths.includes("/tim-kami"));
  assert.ok(paths.includes("/admin"));
});
