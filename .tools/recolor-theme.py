# 既存CSSの緑系の色を、ジャーナル版の色調に「その場で」置き換える。
# 上書き用の別ファイルにすると、同じ強さのルールの順番が変わって表示が崩れるため、元のファイルを直接書き換える。
# 使い方: python .tools/recolor-theme.py src
import re, sys, colorsys, pathlib
src = pathlib.Path(sys.argv[1])
skip = {"home-experience.css", "home-editorial.css", "home-notebook.css", "site-footer.css", "site-header.css", "site-theme.css", "pricing-journal.css"}
HEX = re.compile(r"#[0-9a-fA-F]{6}\b")

def mapped(h):
    r, g, b = (int(h[i:i+2], 16) / 255 for i in (1, 3, 5))
    hh, l, s = colorsys.rgb_to_hls(r, g, b); hue = hh * 360
    if s < 0.12 or not 140 <= hue <= 215: return None
    if l < 0.2: return "#1c1b18"
    if l < 0.5: return "#23574d"
    if l < 0.85: return "#6f8f86"
    if l < 0.93: return "#e4dccc"
    return "#f6f1e8"

files = [f for f in sorted(src.glob("*.css")) if f.name not in skip] + [p for p in [src.parent / "legal-pages.css"] if p.exists()]
total = 0
for f in files:
    text = f.read_text(encoding="utf-8")
    count = 0
    def swap(m):
        global count
        new = mapped(m.group(0).lower())
        if new: count += 1; return new
        return m.group(0)
    count = 0
    new_text = HEX.sub(swap, text)
    if count: f.write_text(new_text, encoding="utf-8"); total += count
print(total, "colors replaced")
