"use server";
import { guestUploadKey } from "./guest-listing";

// Next Server Actions enforce same-origin requests. Establish this cookie before
// starting parallel photo uploads so every photo has the same anonymous owner.
export async function initializeListingUpload() {
  await guestUploadKey(true);
}
