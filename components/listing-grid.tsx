import { EmptyListings } from "./empty-listings";
import { PropertyCard } from "./property-card";
import { SavedListingGrid } from "./saved-listing-grid";
import type { Field, Listing } from "@/lib/types";

/** Kartu dirender di server (tanpa hidrasi); hanya daftar "tersimpan" yang
 * butuh JS karena datanya ada di localStorage. */
export function ListingGrid({
  listings,
  fields,
  favorites = false,
}: {
  listings: Listing[];
  fields: Field[];
  favorites?: boolean;
}) {
  if (favorites) return <SavedListingGrid fields={fields} />;
  return listings.length ? (
    <div className="property-grid">
      {listings.map((p, i) => (
        <PropertyCard key={p.id} property={p} fields={fields} index={i} />
      ))}
    </div>
  ) : (
    <EmptyListings />
  );
}
