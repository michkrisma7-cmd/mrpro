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
  assert.match(html, /Harga/);
  assert.match(html, /Lokasi/);
});
