#!/usr/bin/env python3
"""Link audit for the PC Depository page (TIER 1-3 / TIER 2-8).

Fetches every nav destination, the page's own deep links, dictionary links,
the patent link, sitemap + robots + data files — live over HTTPS.
Exit 0 when every link resolves (HTTP 200), nonzero otherwise.
"""
import sys
import urllib.request

BASE = "https://justinahiggins614-cmyk.github.io/jah-computer-systems/"
NAV = [
    ("1 Telephone Book", "https://justinahiggins614-cmyk.github.io/jah-ai-models/"),
    ("2 Calculator", "https://justinahiggins614-cmyk.github.io/jah-calculator/"),
    ("3 Dictionary", "https://justinahiggins614-cmyk.github.io/jah-dictionary/"),
    ("4 JAH Wiki", "https://justinahiggins614-cmyk.github.io/jah-wiki/"),
    ("5 JAH-N Wiki", "https://justinahiggins614-cmyk.github.io/jah-n-wiki-leaks/"),
    ("6 Patent Catalog", "https://justinahiggins614-cmyk.github.io/cyber-patent-catalog/"),
    ("7 Spec Catalog", "https://justinahiggins614-cmyk.github.io/signature-one-archive/specs.html"),
    ("8 Signature Llama", "https://justinahiggins614-cmyk.github.io/signature-llama/"),
    ("9 PC Depository (self)", BASE),
]
OWN = [
    ("sitemap index", BASE + "sitemap.xml"),
    ("sitemap records", BASE + "sitemap-records-1.xml"),
    ("robots", BASE + "robots.txt"),
    ("data/systems.json", BASE + "data/systems.json"),
    ("data/count.json", BASE + "data/count.json"),
    ("data/last-updated.json", BASE + "data/last-updated.json"),
    ("?system= deep link", BASE + "?system=JAH-PC-90000001"),
    ("?model= deep link", BASE + "?model=728194"),
    ("?seed= deep link", BASE + "?seed=728194"),
    ("dictionary ?w= link", "https://justinahiggins614-cmyk.github.io/jah-dictionary/?w=abacus"),
    ("patent ?patent= link", "https://justinahiggins614-cmyk.github.io/cyber-patent-catalog/?patent=2524035"),
]


def check(name, url):
    req = urllib.request.Request(url, headers={"User-Agent": "jah-pc-qa/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            code = r.getcode()
            ok = code == 200
            print(("PASS " if ok else "FAIL ") + f"{name} -> {code}")
            return ok
    except Exception as e:  # noqa: BLE001 - report anything as a dead link
        print("FAIL " + f"{name} -> ERROR {e}")
        return False


def main():
    bad = 0
    for name, url in NAV + OWN:
        if not check(name, url):
            bad += 1
    print(f"\nRESULT: {len(NAV) + len(OWN) - bad} ok, {bad} dead")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
