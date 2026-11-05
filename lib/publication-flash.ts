import { cookies } from "next/headers";
export const publicationCookie = "mr-property-published";
export async function setPublicationFlash(id: string) {
  (await cookies()).set(publicationCookie, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 120,
  });
}
