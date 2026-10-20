# 既存CSSの緑系・紺系の色を、ジャーナル版の色に置き換える上書きCSSを生成する。
import re, sys, colorsys, pathlib
src = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2])
skip = {"home-experience.css", "home-editorial.css", "home-notebook.css", "site-footer.css", "site-header.css", "site-theme.css", "site-theme-recolor.css"}
HEX = re.compile(r"#[0-9a-fA-F]{6}\b")

def mapped(h):
    r, g, b = (int(h[i:i+2], 16) / 255 for i in (1, 3, 5))
    hh, l, s = colorsys.rgb_to_hls(r, g, b); hue = hh * 360
    if s < 0.12: return None
    if 140 <= hue <= 215:
        if l < 0.2: return "#1c1b18"
        if l < 0.5: return "#23574d"
        if l < 0.85: return "#6f8f86"
        if l < 0.93: return "#e4dccc"
        return "#f6f1e8"
    return None

def split_blocks(css):
    i, n, blocks = 0, len(css), []
    while i < n:
        j = css.find("{", i)
        if j < 0: break
        head = css[i:j].strip(); depth, k = 1, j + 1
        while k < n and depth:
            if css[k] == "{": depth += 1
            elif css[k] == "}": depth -= 1
            k += 1
        blocks.append((head, css[j + 1:k - 1])); i = k
    return blocks

def rules(css):
    res = []
    for head, body in split_blocks(re.sub(r"/\*.*?\*/", "", css, flags=re.S)):
        if head.startswith("@media"):
            inner = rules(body)
            if inner: res.append(head + "{" + "".join(inner) + "}")
        elif head.startswith("@"): continue
        else:
            decls = []
            for d in body.split(";"):
                if ":" not in d or not HEX.search(d): continue
                new = HEX.sub(lambda m: mapped(m.group(0).lower()) or m.group(0), d)
                if new != d: decls.append(new.strip())
            if decls: res.append(head + "{" + ";".join(decls) + "}")
    return res

lines = ["/* 自動生成：python .tools/recolor-theme.py src src/site-theme-recolor.css。既存スタイルの緑系の色をジャーナル版の色調に置き換える。手で編集しない。 */"]
for f in sorted(src.glob("*.css")):
    if f.name in skip: continue
    r = rules(f.read_text(encoding="utf-8"))
    if r: lines.append(f"/* {f.name} */"); lines += r
lines_legal = src.parent / "legal-pages.css"
if lines_legal.exists():
    r = rules(lines_legal.read_text(encoding="utf-8"))
    if r: lines.append("/* legal-pages.css */"); lines += r
out.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(sum(1 for l in lines if not l.startswith("/*")), "rules")
