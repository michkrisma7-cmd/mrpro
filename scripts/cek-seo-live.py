#!/usr/bin/env python3
"""Cek SEO live MR Properti. Gagal (exit 1) bila ada masalah.

    python3 scripts/cek-seo-live.py                       # https://mrproperti.com
    python3 scripts/cek-seo-live.py https://mrproperti.com

Wajib di domain resmi:
- robots.txt: Allow: / + Sitemap; tanpa "Disallow: /" untuk semua halaman.
- Semua URL sitemap: HTTP 200, tepat satu <meta name="robots" content="index, follow">,
  tanpa header X-Robots-Tag noindex, canonical = URL itu, title 10–70 karakter,
  description 50–170, og:title/description/image/url, satu H1.
- Halaman yang tidak ada: HTTP 404 sungguhan (bukan soft-404) + noindex.
Hanya membaca; aman dijalankan kapan saja (4 permintaan paralel).
"""
import concurrent.futures as cf
import re
import sys
import urllib.error
import urllib.request
from html.parser import HTMLParser

BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://mrproperti.com").rstrip("/")
UA = "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36 cek-seo-mrp"


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, r.headers, r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.headers, e.read().decode("utf-8", "replace")


class Head(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta, self.robots, self.canon, self.title, self.h1 = {}, [], [], "", 0
        self._in_title = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "meta":
            key = a.get("name") or a.get("property")
            if key == "robots":
                self.robots.append(a.get("content"))
            elif key:
                self.meta.setdefault(key, a.get("content") or "")
        elif tag == "link" and a.get("rel") == "canonical":
            self.canon.append(a.get("href"))
        elif tag == "title":
            self._in_title = True
        elif tag == "h1":
            self.h1 += 1

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False

    def handle_data(self, data):
        if self._in_title:
            self.title += data


def check(url):
    status, headers, body = get(url)
    p = Head()
    p.feed(body)
    out = []
    if status != 200:
        out.append(f"status {status}")
    if p.robots != ["index, follow"]:
        out.append(f"meta robots {p.robots}")
    if "noindex" in (headers.get("X-Robots-Tag") or ""):
        out.append("X-Robots-Tag noindex")
    if len(p.canon) != 1 or p.canon[0].rstrip("/") != url.rstrip("/"):
        out.append(f"canonical {p.canon}")
    title = p.title.strip()
    if not 10 <= len(title) <= 70:
        out.append(f"title {len(title)} karakter")
    if not 50 <= len(p.meta.get("description", "")) <= 170:
        out.append(f"description {len(p.meta.get('description', ''))} karakter")
    for key in ("og:title", "og:description", "og:image", "og:url"):
        if not p.meta.get(key):
            out.append(f"tanpa {key}")
    if p.h1 != 1:
        out.append(f"H1 {p.h1}")
    return url, out


def main():
    fails = 0
    status, _, robots = get(BASE + "/robots.txt")
    if status != 200 or "Allow: /" not in robots or re.search(r"(?m)^Disallow: /\s*$", robots) or "Sitemap:" not in robots:
        print("GAGAL robots.txt:", status, robots.strip().replace("\n", " | "))
        fails += 1
    status, _, sitemap = get(BASE + "/sitemap.xml")
    urls = re.findall(r"<loc>([^<]+)</loc>", sitemap)
    if status != 200 or not urls:
        print("GAGAL sitemap.xml:", status, len(urls), "url")
        return 1
    with cf.ThreadPoolExecutor(4) as ex:
        for url, problems in ex.map(check, urls):
            if problems:
                fails += 1
                print("GAGAL", url, "|", "; ".join(problems))
    for path in ("/properti/tidak-ada-cek-seo", "/blog/tidak-ada-cek-seo", "/wilayah/tidak-ada",
                 "/layanan/tidak-ada", "/halaman-tidak-ada-cek-seo", "/properti?page=999999"):
        status, _, body = get(BASE + path)
        p = Head()
        p.feed(body)
        if status != 404 or not p.robots or any("noindex" not in r for r in p.robots):
            fails += 1
            print("GAGAL 404", path, status, p.robots)
    print(f"{len(urls)} URL sitemap diperiksa, {fails} masalah")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
