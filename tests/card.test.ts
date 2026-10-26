import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PropertyCard } from "../components/property-card";
import { demoListings, defaultFields } from "../lib/demo";
test("card respects visibility and labels for every configured field, including the sixth custom field", () => {
  const extras = Array.from({ length: 6 }, (_, i) => ({
    ...defaultFields[1],
    id: `extra${i}`,
    key: `extra${i}`,
    name: `Field ${i}`,
    cardLabel: i === 5 ? "Label khusus" : "",
    required: false,
  }));
  const fields = [
    ...defaultFields,
    ...extras,
    {
      ...defaultFields[1],
      key: "rahasia",
      name: "Khusus Form",
      showOnCard: false,
      showOnDetail: false,
    },
  ];
  const property = {
    ...demoListings[0],
    ownerName: "Budi Santoso",
    values: {
      ...demoListings[0].values,
      ...Object.fromEntries(extras.map((f, i) => [f.key, `Nilai ${i}`])),
      rahasia: "DATA-PRIVATE-DO-NOT-SHOW",
    },
  };
  const html = renderToStaticMarkup(
    createElement(PropertyCard, { property, fields }),
  );
  assert.match(html, /Label khusus/);
  assert.match(html, /Nilai 5/);
  assert.match(html, /Field 0/);
  assert.doesNotMatch(html, /DATA-PRIVATE-DO-NOT-SHOW/);
  assert.match(html, /Pemilik: Budi Santoso/);
  assert.match(html, /Harga/);
  assert.match(html, /Lokasi/);
});

test("card preserves photo, detail links and information order, with listing contacts", () => {
  const property = {
    ...demoListings[0],
    title: 'Rumah luas & nyaman "keluarga"',
    whatsapp: "+62 (812) 3456-7890",
    ownerName: "Nama pemilik yang sangat panjang untuk pemeriksaan tampilan HP",
  };
  const html = renderToStaticMarkup(
    createElement(PropertyCard, { property, fields: defaultFields }),
  );
  const positions = [
    "property-specs",
    "property-price",
    "<h3",
    "property-location",
    "card-more",
    "property-contact",
  ].map((part) => html.indexOf(part));
  assert.ok(
    positions.every(
      (position, index) =>
        position >= 0 && (!index || position > positions[index - 1]),
    ),
  );
  assert.match(html, /house-1/);
  assert.equal(
    (html.match(new RegExp(`href="/properti/${property.slug}"`, "g")) || [])
      .length,
    3,
  );
  assert.match(html, /href="tel:\+6281234567890"/);
  const wa = new URL(
    html
      .match(/href="(https:\/\/wa\.me\/[^" ]+)"/)![1]
      .replaceAll("&amp;", "&"),
  );
  assert.equal(wa.pathname, "/6281234567890");
  assert.equal(
    wa.searchParams.get("text"),
    `Halo, saya tertarik dengan properti ${property.title}. Apakah masih tersedia? http://localhost:3000/properti/${property.slug}`,
  );
  assert.match(html, /aria-pressed="false"/);
  assert.doesNotMatch(html, /avatar/);
});

test("card hides both contact actions for missing or invalid listing contacts", () => {
  for (const whatsapp of [
    "",
    "12",
    "abc081234567890",
    "00000000000",
    "08+1234567890",
  ]) {
    const html = renderToStaticMarkup(
      createElement(PropertyCard, {
        property: { ...demoListings[0], whatsapp },
        fields: defaultFields,
      }),
    );
    assert.doesNotMatch(html, /href="(?:tel:|https:\/\/wa\.me\/)/);
    assert.match(html, /property-contact-owner/);
    assert.match(html, /Lihat properti/);
  }
});
