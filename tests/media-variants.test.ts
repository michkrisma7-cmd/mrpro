import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import sharp from "sharp";
import {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { optimizeDisplay, optimizeUpload } from "../lib/image-upload";
import { displayImageKey } from "../lib/image-variants";

const key = "properties/owner/photo.webp";
const media = {
  id: "photo",
  key,
  ownerId: "owner",
  guestKey: null as string | null,
};

async function fixture(master: Buffer) {
  const state = {
    published: true,
    team: false,
    testimonial: false,
    user: null as { id: string; role: string } | null,
    guestKey: null as string | null,
    media: { ...media, ownerId: media.ownerId as string | null },
    writeFailure: false,
    derivativeReadForbidden: false,
    failSecondWrite: false,
    databaseFailure: false,
  };
  const objects = new Map<string, Buffer>([[key, master]]);
  const reads: string[] = [];
  const writes: string[] = [];
  const deleted: string[] = [];
  const queries: string[] = [];
  const client = {
    async send(
      command: GetObjectCommand | PutObjectCommand | DeleteObjectCommand,
    ) {
      const objectKey = command.input.Key!;
      if (command instanceof PutObjectCommand) {
        writes.push(objectKey);
        if (
          state.writeFailure ||
          (state.failSecondWrite && writes.length === 2)
        )
          throw Error("storage unavailable");
        assert.ok(Buffer.isBuffer(command.input.Body));
        objects.set(objectKey, command.input.Body);
        return {};
      }
      if (command instanceof DeleteObjectCommand) {
        deleted.push(objectKey);
        objects.delete(objectKey);
        return {};
      }
      reads.push(objectKey);
      if (state.derivativeReadForbidden && objectKey === displayImageKey(key))
        throw Object.assign(Error("access denied"), {
          $metadata: { httpStatusCode: 403 },
        });
      const body = objects.get(objectKey);
      if (!body)
        throw Object.assign(Error("missing"), {
          name: "NoSuchKey",
          $metadata: { httpStatusCode: 404 },
        });
      return {
        Body: {
          transformToByteArray: async () => new Uint8Array(body),
          transformToWebStream: () =>
            new ReadableStream({
              start(controller) {
                controller.enqueue(new Uint8Array(body));
                controller.close();
              },
            }),
        },
      };
    },
  };
  const database = {
    media: {
      findUnique: async () => {
        queries.push("media");
        return state.media;
      },
      count: async () => 0,
      create: async () => {
        if (state.databaseFailure) throw Error("database unavailable");
        return { id: "new-photo" };
      },
    },
    property: {
      count: async () => {
        queries.push("property");
        return Number(state.published);
      },
    },
    teamMember: {
      count: async () => {
        queries.push("team");
        return Number(state.team);
      },
    },
    testimonial: {
      count: async () => {
        queries.push("testimonial");
        return Number(state.testimonial);
      },
    },
  };
  async function load(path: string) {
    const exports = {};
    runInNewContext(
      ts.transpileModule(await readFile(path, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS },
      }).outputText,
      {
        exports,
        require(name: string) {
          if (name === "@/lib/db")
            return { databaseConfigured: true, db: () => database };
          if (name === "@/lib/auth")
            return { currentUser: async () => state.user };
          if (name === "@/lib/storage")
            return {
              bucket: "fixture",
              s3: () => client,
              storageConfigured: true,
            };
          if (name === "@aws-sdk/client-s3")
            return { GetObjectCommand, PutObjectCommand, DeleteObjectCommand };
          if (name === "@/lib/guest-listing")
            return {
              guestUploadKey: async () => state.guestKey,
              allowGuestListingAttempt: async () => true,
            };
          if (name === "@/lib/image-upload")
            return { optimizeUpload, optimizeDisplay };
          if (name === "@/lib/image-variants") return { displayImageKey };
          if (name === "../route") return routes;
          if (name === "@/lib/upload-body")
            return {
              boundedFormData: async () => {
                const form = new FormData();
                form.set(
                  "file",
                  new File([new Uint8Array(master)], "photo.webp", {
                    type: "image/webp",
                  }),
                );
                return form;
              },
            };
          throw Error(name);
        },
        Buffer,
        URL,
        Request,
        Response,
        File,
        process: { env: { NEXT_PUBLIC_SITE_URL: "https://example.test" } },
        crypto: { randomUUID: () => "fresh-upload" },
      },
    );
    return exports;
  }
  const routes = (await load("app/api/media/[id]/route.ts")) as {
    GET: (
      request: Request,
      context: { params: Promise<{ id: string }> },
    ) => Promise<Response>;
  };
  async function get(variant = "?variant=display") {
    return routes.GET(
      new Request(`https://example.test/api/media/photo${variant}`),
      {
        params: Promise.resolve({ id: "photo" }),
      },
    );
  }
  async function upload() {
    const route = (await load("app/api/upload/route.ts")) as {
      POST: (request: Request) => Promise<Response>;
    };
    return route.POST(
      new Request("https://example.test/api/upload", {
        method: "POST",
        headers: { origin: "https://example.test", host: "example.test" },
      }),
    );
  }
  async function getAlias() {
    const route = (await load("app/api/media/[id]/display.webp/route.ts")) as {
      GET: typeof routes.GET;
    };
    return route.GET(
      new Request("https://example.test/api/media/photo/display.webp"),
      {
        params: Promise.resolve({ id: "photo" }),
      },
    );
  }
  return {
    state,
    objects,
    reads,
    writes,
    deleted,
    queries,
    get,
    getAlias,
    upload,
  };
}

async function photo() {
  return sharp({
    create: { width: 1800, height: 1350, channels: 3, background: "orange" },
  })
    .webp({ lossless: true })
    .toBuffer();
}

test("older public media gets a reusable display copy while the canonical master stays unchanged", async () => {
  const original = await photo();
  const f = await fixture(original);
  const response = await f.get();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-cache");
  assert.equal(
    response.headers.get("cloudflare-cdn-cache-control"),
    "public, max-age=300, must-revalidate",
  );
  const metadata = await sharp(
    Buffer.from(await response.arrayBuffer()),
  ).metadata();
  assert.equal(metadata.width, 1200);
  assert.equal(metadata.height, 900);
  assert.deepEqual(f.objects.get(key), original);
  assert.deepEqual(f.writes, [displayImageKey(key)]);
  assert.deepEqual(f.queries, ["media", "property"]);

  const cached = await f.get();
  assert.equal(cached.status, 200);
  assert.equal(f.reads.filter((read) => read === key).length, 1);
  assert.equal(f.writes.length, 1);
  const master = await f.get("");
  assert.equal(
    master.headers.get("cache-control"),
    "public, max-age=300, stale-while-revalidate=3600",
  );
  assert.equal(master.headers.get("cloudflare-cdn-cache-control"), null);
  assert.deepEqual(Buffer.from(await master.arrayBuffer()), original);
});

test("simultaneous requests for one old photo share conversion; unpublishing still checks permissions", async () => {
  const f = await fixture(await photo());
  const responses = await Promise.all([f.get(), f.get(), f.get()]);
  assert.deepEqual(
    responses.map((response) => response.status),
    [200, 200, 200],
  );
  assert.equal(f.reads.filter((read) => read === key).length, 1);
  assert.equal(f.writes.length, 1);
  f.state.published = false;
  const previousReads = f.reads.length;
  const denied = await f.get();
  assert.equal(denied.status, 404);
  assert.equal(denied.headers.get("cache-control"), "private, no-store");
  assert.equal(
    denied.headers.get("cloudflare-cdn-cache-control"),
    "private, no-store",
  );
  assert.equal(
    f.reads.length,
    previousReads,
    "denied media never touches object storage",
  );
});

test("private derivative access preserves owner, admin and guest rules without public caching", async () => {
  const f = await fixture(await photo());
  f.state.published = false;
  assert.equal((await f.get()).status, 404);
  f.state.user = { id: "other", role: "MEMBER" };
  assert.equal((await f.get()).status, 404);
  assert.equal(f.reads.length, 0);
  for (const user of [
    { id: "owner", role: "MEMBER" },
    { id: "admin", role: "ADMIN" },
  ]) {
    f.state.user = user;
    const response = await f.get();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.equal(
      response.headers.get("cloudflare-cdn-cache-control"),
      "private, no-store",
    );
  }
  f.state.user = null;
  f.state.media.ownerId = null;
  f.state.media.guestKey = "guest-owner";
  f.state.guestKey = "wrong-guest";
  assert.equal((await f.get()).status, 404);
  f.state.guestKey = "guest-owner";
  assert.equal((await f.get()).status, 200);
});

test("unknown variants are not generated or cached", async () => {
  const f = await fixture(await photo());
  const response = await f.get("?variant=huge");
  assert.equal(response.status, 400);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(
    response.headers.get("cloudflare-cdn-cache-control"),
    "private, no-store",
  );
  assert.equal(f.queries.length, 0);
  assert.equal(f.reads.length, 0);
});

test("the explicit WebP URL shares access checks and public cache headers", async () => {
  const f = await fixture(await photo());
  const publicPhoto = await f.getAlias();
  assert.equal(publicPhoto.status, 200);
  assert.equal(publicPhoto.headers.get("content-type"), "image/webp");
  assert.equal(publicPhoto.headers.get("cache-control"), "private, no-cache");
  assert.equal(
    publicPhoto.headers.get("cloudflare-cdn-cache-control"),
    "public, max-age=300, must-revalidate",
  );
  assert.equal(
    (await sharp(Buffer.from(await publicPhoto.arrayBuffer())).metadata())
      .width,
    1200,
  );
  f.state.published = false;
  const previousReads = f.reads.length;
  const hiddenPhoto = await f.getAlias();
  assert.equal(hiddenPhoto.status, 404);
  assert.equal(hiddenPhoto.headers.get("cache-control"), "private, no-store");
  assert.equal(
    hiddenPhoto.headers.get("cloudflare-cdn-cache-control"),
    "private, no-store",
  );
  assert.equal(f.reads.length, previousReads);
});

test("a derivative persistence failure still delivers a valid display image", async () => {
  const f = await fixture(await photo());
  f.state.writeFailure = true;
  const response = await f.get();
  assert.equal(response.status, 200);
  assert.equal(
    (await sharp(Buffer.from(await response.arrayBuffer())).metadata()).width,
    1200,
  );
  assert.equal(f.objects.size, 1);
});

test("old display generation works when S3 reports missing derivatives as 403 without ListBucket", async () => {
  const f = await fixture(await photo());
  f.state.derivativeReadForbidden = true;
  const response = await f.get();
  assert.equal(response.status, 200);
  assert.ok(f.objects.has(displayImageKey(key)));
});

test("upload precomputes display copy and cleans both objects if database creation fails", async () => {
  const f = await fixture(await photo());
  f.state.user = { id: "owner", role: "MEMBER" };
  f.state.databaseFailure = true;
  const response = await f.upload();
  assert.equal(response.status, 502);
  assert.equal(f.writes.length, 2);
  assert.deepEqual(f.deleted.sort(), f.writes.sort());
  assert.equal(
    f.objects.size,
    1,
    "existing original is untouched by failed upload",
  );
});

test("successful uploads store display and master while returning the stable canonical media URL", async () => {
  const f = await fixture(await photo());
  f.state.user = { id: "owner", role: "MEMBER" };
  const response = await f.upload();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { url: "/api/media/new-photo" });
  assert.equal(f.writes.length, 2);
  assert.equal(
    (await sharp(f.objects.get(f.writes[0])!).metadata()).width,
    1800,
  );
  assert.equal(
    (await sharp(f.objects.get(f.writes[1])!).metadata()).width,
    1200,
  );
});

test("upload also removes its master if the display write fails", async () => {
  const f = await fixture(await photo());
  f.state.user = { id: "owner", role: "MEMBER" };
  f.state.failSecondWrite = true;
  const response = await f.upload();
  assert.equal(response.status, 502);
  assert.equal(f.writes.length, 2);
  assert.deepEqual(f.deleted.sort(), f.writes.sort());
  assert.equal(f.objects.size, 1);
});
