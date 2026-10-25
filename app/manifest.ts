import type { MetadataRoute } from "next";
import { brandIcons } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MR Properti",
    short_name: "MR Properti",
    lang: "id",
    start_url: "/",
    display: "browser",
    background_color: "#ffffff",
    theme_color: "#101010",
    icons: brandIcons,
  };
}
