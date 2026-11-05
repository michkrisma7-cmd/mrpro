"use server";
import { cookies } from "next/headers";
import { publicationCookie } from "./publication-flash";
export async function dismissPublication() {
  (await cookies()).delete(publicationCookie);
}
