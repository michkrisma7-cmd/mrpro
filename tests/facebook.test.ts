import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { z } from "zod";
import * as validation from "../lib/validation";
import { facebookPayload, sendFacebookWebhook } from "../lib/facebook-post";
import { defaultFields } from "../lib/demo";
import type { ActionState } from "../lib/types";

const property = {
  id: "property-1",
  title: "Rumah Cikarang",
  slug: "rumah-cikarang",
  description:
    "Rumah nyaman dekat fasilitas umum dengan akses jalan yang luas.",
  whatsapp: "081234567890",
  gallery: ["/api/media/ownedphoto"],
  values: { harga: 500000000, lokasi: "Cikarang", rahasia: "jangan dibagikan" },
};

test("Facebook caption includes only public fields, contact and property link", () => {
  const payload = facebookPayload(
    property,
    defaultFields,
    "https://mrproperti.com",
  );
  assert.equal(payload.link, "https://mrproperti.com/properti/rumah-cikarang");
  assert.match(payload.message, /500.000.000/);
  assert.match(payload.message, /https:\/\/wa.me\/6281234567890/);
  assert.doesNotMatch(payload.message, /jangan dibagikan/);
  assert.throws(() =>
    facebookPayload(property, defaultFields, "http://localhost:3000"),
  );
});

test("only a transition to PUBLISHED sends a webhook; edits and repeated publication do not", async () => {
  const listing = { ...property, status: "PENDING", featured: false };
  let sent = 0,
    allowAdmin = true;
  let delivery: "accepted" | "failed" = "accepted";
  const fields = defaultFields.filter((f) => f.key === "lokasi");
  const api = {} as {
    moderateProperty(state: ActionState, form: FormData): Promise<ActionState>;
    editProperty(state: ActionState, form: FormData): Promise<ActionState>;
  };
  const source = ts.transpileModule(await readFile("lib/actions.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  runInNewContext(source, {
    exports: api,
    FormData,
    require: (name: string) => {
      if (name === "zod") return { z };
      if (name === "./validation") return validation;
      if (name === "./data") return { getFields: async () => fields };
      if (name === "./auth")
        return {
          requireAdmin: async () => {
            if (!allowAdmin) throw new Error("admin required");
            return { id: "admin" };
          },
        };
      if (name === "next/cache")
        return { revalidatePath: () => {}, revalidateTag: () => {} };
      if (name === "next/navigation") return { redirect: () => {} };
      if (name === "./facebook-post")
        return {
          sendFacebookWebhook: async () => {
            assert.equal(
              listing.status,
              "PUBLISHED",
              "status must be saved before the webhook",
            );
            sent++;
            return delivery;
          },
        };
      if (name === "./db")
        return {
          db: () => ({
            property: {
              findUniqueOrThrow: async () => ({ ...listing }),
              updateMany: async () => {
                if (listing.status === "PUBLISHED") return { count: 0 };
                listing.status = "PUBLISHED";
                return { count: 1 };
              },
              update: async ({ data }: { data: Partial<typeof listing> }) =>
                Object.assign(listing, data),
            },
          }),
        };
      throw new Error(name);
    },
  });
  const form = new FormData();
  form.set("id", property.id);
  form.set("status", "PUBLISHED");
  allowAdmin = false;
  await assert.rejects(api.moderateProperty({}, form), /admin required/);
  assert.equal(sent, 0);
  allowAdmin = true;
  assert.ok((await api.moderateProperty({}, form)).success);
  assert.equal(sent, 1);
  await api.moderateProperty({}, form);
  assert.equal(sent, 1, "PUBLISHED to PUBLISHED is not a new publication");
  for (const [key, value] of Object.entries({
    title: property.title,
    description: property.description,
    whatsapp: property.whatsapp,
    field_lokasi: "Bekasi",
  }))
    form.set(key, value);
  assert.ok((await api.editProperty({}, form)).success);
  assert.equal(sent, 1, "editing a published property must not post");
  for (const status of ["ARCHIVED", "REJECTED", "PENDING"]) {
    form.set("status", status);
    await api.moderateProperty({}, form);
  }
  assert.equal(sent, 1);
  form.set("status", "PUBLISHED");
  const concurrent = await Promise.all([
    api.moderateProperty({}, form),
    api.moderateProperty({}, form),
  ]);
  assert.ok(concurrent.every((result) => result.success));
  assert.equal(sent, 2, "only one concurrent transition may send");
  form.set("status", "ARCHIVED");
  await api.moderateProperty({}, form);
  delivery = "failed";
  form.set("status", "PUBLISHED");
  const result = await api.moderateProperty({}, form);
  assert.match(result.success!, /webhook Facebook gagal/);
  assert.equal(
    listing.status,
    "PUBLISHED",
    "webhook failure must not undo publication",
  );
});

test("webhook sends one authenticated request without retry and remains optional", async () => {
  const keys = [
    "N8N_FACEBOOK_WEBHOOK_URL",
    "N8N_FACEBOOK_WEBHOOK_SECRET",
    "NEXT_PUBLIC_SITE_URL",
  ];
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const originalFetch = globalThis.fetch,
    originalError = console.error;
  const calls: { url: string; options: RequestInit }[] = [];
  try {
    console.error = () => {};
    delete process.env.N8N_FACEBOOK_WEBHOOK_URL;
    globalThis.fetch = async (url, options) => {
      calls.push({ url: String(url), options: options! });
      return new Response("{}", { status: 200 });
    };
    assert.equal(
      await sendFacebookWebhook(property, defaultFields),
      "disabled",
    );
    assert.equal(calls.length, 0);
    process.env.N8N_FACEBOOK_WEBHOOK_URL =
      "https://n8n.example.test/webhook/mr-properti-published";
    process.env.N8N_FACEBOOK_WEBHOOK_SECRET = "test-secret";
    process.env.NEXT_PUBLIC_SITE_URL = "https://mrproperti.com";
    assert.equal(
      await sendFacebookWebhook(property, defaultFields),
      "accepted",
    );
    assert.equal(calls.length, 1);
    const request = calls[0].options;
    assert.equal(request.method, "POST");
    assert.equal(
      (request.headers as Record<string, string>)["x-api-key"],
      "test-secret",
    );
    assert.equal(request.redirect, "error");
    const body = JSON.parse(String(request.body));
    assert.equal(body.event, "property.published");
    assert.equal(body.propertyId, property.id);
    assert.equal(body.link, "https://mrproperti.com/properti/rumah-cikarang");
    globalThis.fetch = async () => {
      calls.push({ url: "failed", options: {} });
      throw new Error("timeout");
    };
    assert.equal(await sendFacebookWebhook(property, defaultFields), "failed");
    assert.equal(calls.length, 2, "failed request must not retry");
    delete process.env.N8N_FACEBOOK_WEBHOOK_SECRET;
    assert.equal(await sendFacebookWebhook(property, defaultFields), "failed");
    assert.equal(calls.length, 2, "missing secret must not send");
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
});

test("workflow has exactly Webhook → Facebook Graph API, without a schedule", async () => {
  const workflow = JSON.parse(
    await readFile("workflows/n8n/mr-properti-facebook-pages.json", "utf8"),
  );
  assert.equal(workflow.active, false);
  assert.deepEqual(
    workflow.nodes.map((n: { type: string }) => n.type),
    ["n8n-nodes-base.webhook", "n8n-nodes-base.facebookGraphApi"],
  );
  const [webhook, facebook] = workflow.nodes;
  assert.equal(webhook.parameters.authentication, "headerAuth");
  assert.equal(webhook.parameters.httpMethod, "POST");
  assert.equal(
    workflow.connections[webhook.name].main[0][0].node,
    facebook.name,
  );
  assert.equal(facebook.parameters.httpRequestMethod, "POST");
  assert.equal(facebook.parameters.edge, "feed");
  assert.equal(facebook.retryOnFail, false);
  assert.deepEqual(facebook.parameters.options.queryParameters.parameter, [
    { name: "message", value: "={{ $json.body.message }}" },
    { name: "link", value: "={{ $json.body.link }}" },
  ]);
});
