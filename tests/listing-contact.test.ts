import { test } from "node:test";
import assert from "node:assert/strict";
import {
  listingContactNumber,
  listingWhatsappLink,
} from "../lib/listing-contact";

test("public listing contacts normalize Indonesian formats and reject invalid input", () => {
  for (const value of [
    "081234567890",
    "+62 812-3456-7890",
    "6281234567890",
    " (0812) 3456.7890 ",
  ]) {
    assert.equal(listingContactNumber(value), "6281234567890");
  }
  for (const value of [
    "",
    "   ",
    "12",
    "00000000000",
    "62812345678901234",
    "call 081234567890",
    "08+1234567890",
  ]) {
    assert.equal(listingContactNumber(value), null);
  }
});

test("WhatsApp message preserves title punctuation and the full property URL", () => {
  const title = 'Rumah & taman #1 + "asri"';
  const detail = "https://mrproperti.com/properti/rumah-asri";
  const link = new URL(listingWhatsappLink("6281234567890", title, detail));
  assert.equal(link.origin, "https://wa.me");
  assert.equal(link.pathname, "/6281234567890");
  assert.equal(
    link.searchParams.get("text"),
    `Halo, saya tertarik dengan properti ${title}. Apakah masih tersedia? ${detail}`,
  );
});
