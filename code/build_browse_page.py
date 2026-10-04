#!/usr/bin/env python3
"""Assemble browse.html from code/browse_template.html.

The theme <style> block and the JAH Network nav are extracted from index.html
at build time, so the browse page's look is identical to the depository home
page by construction (standing no-redesign rule: never hand-copy styles).

After assembling, run code/gen_browse_index.py to build the lazy-load data
files and stamp the real count into the page.
"""
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def main():
    tpl = open(os.path.join(ROOT, "code", "browse_template.html")).read()
    idx = open(os.path.join(ROOT, "index.html")).read()
    style = idx[idx.index("<style>"):idx.index("</style>") + len("</style>")]
    nav = re.search(r'<nav aria-label="JAH Network Global Ecosystem".*?</nav>',
                    idx, re.S).group(0)
    html = tpl.replace("%%STYLE%%", style).replace("%%NAV%%", nav)
    out = os.path.join(ROOT, "browse.html")
    open(out, "w").write(html)
    print(f"browse.html assembled ({len(html):,} bytes)")


if __name__ == "__main__":
    main()
