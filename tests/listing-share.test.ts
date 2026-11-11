import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PropertyCard } from "../components/property-card";
import { demoListings, defaultFields } from "../lib/demo";
import {
  listingDetailPath,
  listingShareLinks,
  listingShareUrl,
} from "../lib/listing-share";

test("all share intents encode the selected listing and never select a recipient", () => {
  const listing = {
    slug: "rumah-nyaman-123",
    title: 'Rumah & taman + kolam #1 "keluarga" 🏡',
    price: "Rp 1.250.000.000",
    location: "Jl. Mawar No. 2, Bekasi & Cikarang",
  };
  const url = "https://mrproperti.com/properti/rumah-nyaman-123";
  const links = listingShareLinks(listing);
  const summary = [listing.title, listing.price, listing.location].join("\n");
  const whatsapp = new URL(links.whatsapp);
  assert.equal(whatsapp.origin, "https://wa.me");
  assert.equal(whatsapp.pathname, "/");
  assert.equal(whatsapp.searchParams.get("text"), `${summary}\n${url}`);
  assert.equal(whatsapp.searchParams.has("phone"), false);
  const facebook = new URL(links.facebook);
  assert.equal(
    facebook.origin + facebook.pathname,
    "https://www.facebook.com/sharer/sharer.php",
  );
  assert.equal(facebook.searchParams.get("u"), url);
  const twitter = new URL(links.twitter);
  assert.equal(
    twitter.origin + twitter.pathname,
    "https://twitter.com/intent/tweet",
  );
  assert.equal(twitter.searchParams.get("url"), url);
  assert.equal(twitter.searchParams.get("text"), summary.replaceAll("\n", " "));
  const telegram = new URL(links.telegram);
  assert.equal(telegram.origin + telegram.pathname, "https://t.me/share/url");
  assert.equal(telegram.searchParams.get("url"), url);
  assert.equal(telegram.searchParams.get("text"), summary);
  const email = new URL(links.email);
  assert.equal(email.protocol, "mailto:");
  assert.equal(email.pathname, "");
  assert.equal(email.searchParams.get("subject"), listing.title);
  assert.equal(
    email.searchParams.get("body"),
    `${listing.price}\n${listing.location}\n${url}`,
  );
});

test("canonical sharing isolates slug segments, optional data and long Unicode tweets", () => {
  assert.equal(
    listingDetailPath("rumah/apa?x=#"),
    "/properti/rumah%2Fapa%3Fx%3D%23",
  );
  assert.equal(
    new URL(listingShareUrl("//beta.mrproperti.com")).origin,
    "https://mrproperti.com",
  );
  const links = listingShareLinks({ slug: "tanah-baru", title: "Tanah baru" });
  assert.equal(
    new URL(links.whatsapp).searchParams.get("text"),
    "Tanah baru\nhttps://mrproperti.com/properti/tanah-baru",
  );
  for (const value of Object.values(links))
    assert.doesNotMatch(
      decodeURIComponent(value),
      /undefined|null|localhost|beta\.mrproperti/,
    );
  const long = new URL(
    listingShareLinks({ slug: "panjang", title: "🏡家".repeat(200) }).twitter,
  );
  const tweet = long.searchParams.get("text")!;
  assert.ok(Array.from(tweet).length * 2 + 24 <= 280);
  assert.ok(tweet.endsWith("…"));
  assert.doesNotMatch(tweet, /\uFFFD/);
});

test("legacy and newly created cards render independent share triggers on the server, even without optional fields", () => {
  for (const property of [
    demoListings[0],
    {
      ...demoListings[1],
      id: "new-listing",
      slug: "new-listing",
      gallery: [],
      values: {},
    },
  ]) {
    const html = renderToStaticMarkup(
      createElement(PropertyCard, { property, fields: defaultFields }),
    );
    assert.match(html, /class="property-share-button"/);
    assert.match(html, /aria-haspopup="dialog"/);
    assert.match(html, /Bagikan/);
    assert.doesNotMatch(html, /<a[^>]*>[^<]*<button|undefined|null/);
    assert.match(html, new RegExp(`href="/properti/${property.slug}"`));
    assert.doesNotMatch(html, /<dialog/);
  }
});
