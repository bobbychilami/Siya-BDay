#!/usr/bin/env python3
"""
Prepare the Siya envelope artwork for the web.

The supplied pack is a set of paintings (mostly on white or cream), not a
production layer kit.  This script keeps every original untouched and derives
separate, aligned cut-outs for the animated envelope:

    src/assets/envelope/source/     the 20 supplied PNGs + README (reference)
    src/assets/envelope/storyboard/ the 12 concept crops (reference only)
    src/assets/envelope/derived/    transparent, web-sized layers used by the site

Run:  python tools/prepare-envelope-assets.py
"""

from __future__ import annotations

import os
import shutil

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PACK = os.path.join(ROOT, "public", "assets", "envelope")
RIVIERA = os.path.join(ROOT, "public", "assets", "riviera")
SRC = os.path.join(ROOT, "src", "assets", "envelope", "source")
STORY = os.path.join(ROOT, "src", "assets", "envelope", "storyboard")
OUT = os.path.join(ROOT, "src", "assets", "envelope", "derived")


def organise() -> None:
    """Move the untouched originals out of the published folder."""
    os.makedirs(SRC, exist_ok=True)
    os.makedirs(STORY, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    if os.path.isdir(PACK):
        for name in sorted(os.listdir(PACK)):
            path = os.path.join(PACK, name)
            if not os.path.isfile(path):
                continue
            target = os.path.join(STORY if name.lower().endswith(".png") and name.startswith("frame_") else SRC, name)
            if os.path.abspath(path) != os.path.abspath(target):
                shutil.move(path, target)
        crops = os.path.join(PACK, "storyboard_reference_crops")
        if os.path.isdir(crops):
            for name in os.listdir(crops):
                shutil.move(os.path.join(crops, name), os.path.join(STORY, name))
            os.rmdir(crops)
        os.rmdir(PACK)
    # the older duplicated copy of the same paintings
    if os.path.isdir(RIVIERA):
        shutil.rmtree(RIVIERA)


def white_to_alpha(im: Image.Image, feather: float = 0.9) -> Image.Image:
    """Cut a painting off its white paper with a soft, watercolour-friendly edge."""
    im = im.convert("RGBA")
    rgb = np.array(im)[:, :, :3].astype(np.int16)
    lo = rgb.min(axis=2)
    hi = rgb.max(axis=2)
    near_white = ((lo >= 241) & ((hi - lo) <= 14)).astype(np.uint8) * 255
    mask = Image.fromarray(near_white, "L")
    w, h = mask.size
    draw = ImageDraw.Draw(mask)
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
             (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]
    for seed in seeds:
        if mask.getpixel(seed) == 255:
            ImageDraw.floodfill(mask, seed, 128, thresh=0)
    exterior = np.array(mask) == 128

    # The supplied props are crops of the sheet: bare paper often survives in
    # pockets *between* leaves where the border flood-fill cannot reach. Remove
    # thick near-white regions as well, but keep the thin specular highlights
    # that sit inside the painting itself.
    masku = np.array(mask, dtype=np.uint8)
    masku[masku == 128] = 0
    core = np.array(Image.fromarray(masku, "L").filter(ImageFilter.MinFilter(15))) > 0
    if core.any():
        cur = Image.fromarray((core * 255).astype(np.uint8), "L")
        paper = Image.fromarray(masku, "L")
        for _ in range(26):
            cur = ImageChops.multiply(cur.filter(ImageFilter.MaxFilter(9)), paper)
        exterior = exterior | (np.array(cur) > 128)

    alpha = np.where(exterior, 0.0, 1.0)
    a_img = Image.fromarray((alpha * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(feather))
    a = np.array(a_img).astype(np.float32) / 255.0

    rgb_f = np.array(im).astype(np.float32)
    safe = np.maximum(a, 0.04)[:, :, None]
    # un-premultiply against white so the edge does not carry a pale halo
    rgb_f[:, :, :3] = np.where(a[:, :, None] > 0.04, (rgb_f[:, :, :3] - (1 - a[:, :, None]) * 255) / safe, 255)
    out = np.clip(rgb_f, 0, 255)
    out[:, :, 3] = a * 255
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def blue_cutout(im: Image.Image, box: tuple[int, int, int, int], feather: float = 0.7) -> Image.Image:
    """Isolate the painted blue satin (ribbon / bow / tails) from cream paper."""
    crop = im.crop(box).convert("RGB")
    hsv = np.array(crop.convert("HSV")).astype(np.float32)
    hue, sat, val = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    band = np.clip((sat - 26.0) / 26.0, 0.0, 1.0)
    in_hue = ((hue >= 112) & (hue <= 196)).astype(np.float32)
    in_val = np.clip((val - 55.0) / 35.0, 0.0, 1.0)
    alpha = band * in_hue * in_val

    # close the small specular highlights inside the satin without filling the
    # real gaps between loops and tails
    filled = np.array(
        Image.fromarray((alpha > 0.34).astype(np.uint8) * 255, "L").filter(ImageFilter.MaxFilter(5))
    ) > 0
    alpha = np.where(filled, 1.0, alpha)
    a_img = Image.fromarray((alpha * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(feather))
    a = np.array(a_img).astype(np.float32) / 255.0

    rgba = np.dstack([np.array(crop).astype(np.float32), a * 255.0]).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA")


def tint_paper(im: Image.Image, base: tuple[int, int, int] = (250, 241, 223)) -> Image.Image:
    """Recolour bare sheet left inside a prop crop to the card paper tone.

    Several supplied props still carry pale paper between their leaves. Cutting
    it out would eat the white blossoms, so instead it is tinted to exactly the
    paper colour the art sits on, which makes the join invisible.
    """
    arr = np.array(im.convert("RGBA")).astype(np.int16)
    rgb = arr[:, :, :3]
    lo = rgb.min(axis=2)
    hi = rgb.max(axis=2)
    pale = (lo >= 232) & ((hi - lo) <= 30)
    rgb[pale] = base
    arr[:, :, :3] = rgb
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def cut_pale_paper(im: Image.Image, reach: int = 15) -> Image.Image:
    """Make bare paper inside a prop crop transparent without eating blossoms.

    A pale pixel survives only when it sits under the brush (next to painted
    detail); sheet left in wide clearings has no painted neighbour and goes.
    """
    arr = np.array(im.convert("RGBA")).astype(np.int16)
    rgb = arr[:, :, :3]
    alpha = arr[:, :, 3]
    lo = rgb.min(axis=2)
    hi = rgb.max(axis=2)
    pale = (lo >= 232) & ((hi - lo) <= 30)
    painted = ((~pale) & (alpha > 8)).astype(np.uint8) * 255
    near = np.array(
        Image.fromarray(painted, "L").filter(ImageFilter.MaxFilter(reach))
    ) > 0
    arr[:, :, 3] = np.where(pale & ~near, 0, alpha)
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def flatten_paper(im: Image.Image, base: tuple[int, int, int] = (250, 241, 223)) -> Image.Image:
    """Even out the painted wash so only the fine paper tooth survives."""
    im = im.convert("RGB").resize((im.width * 2, im.height * 2), Image.LANCZOS)
    arr = np.array(im).astype(np.float32)
    low = np.maximum(np.array(im.filter(ImageFilter.GaussianBlur(40))).astype(np.float32), 1.0)
    tint = np.array(base, dtype=np.float32)
    flat = tint + (arr / low * tint - tint) * 0.82
    return Image.fromarray(np.clip(flat, 0, 255).astype(np.uint8))


def gold_mask(im: Image.Image) -> np.ndarray:
    arr = np.array(im.convert("RGB")).astype(np.int16)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    return (r > 140) & (g > 75) & (g < 195) & (b < 155) & ((r - b) > 70) & ((r - g) > 30)


def find_seal(im: Image.Image) -> tuple[int, int, int, int]:
    """The wax seal sits over the knot; measure the disc only."""
    gold = gold_mask(im)
    window = gold[730:990, 330:610]
    ys, xs = np.nonzero(window)
    return int(xs.min()) + 330, int(ys.min()) + 730, int(xs.max()) + 331, int(ys.max()) + 731


def seal_cutout(im: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    """Circular wax disc plus the little wax drip that spills below it."""
    x0, y0, x1, _y1 = box
    size = x1 - x0  # the disc is circular; the drip only makes the box taller
    cx = (x0 + x1) // 2
    cy = y0 + size // 2
    pad = 6
    box = (cx - size // 2 - pad, cy - size // 2 - pad, cx + size // 2 + pad, cy + size // 2 + pad)
    square = im.crop(box).convert("RGBA")
    w, h = square.size

    circle = Image.new("L", (w * 4, h * 4), 0)
    ImageDraw.Draw(circle).ellipse((3, 3, w * 4 - 3, h * 4 - 3), fill=255)
    circle = circle.resize((w, h), Image.LANCZOS)

    crop_gold = gold_mask(im.crop(box))
    drip = Image.fromarray(crop_gold.astype(np.uint8) * 255, "L").filter(ImageFilter.MaxFilter(3))
    drip = drip.filter(ImageFilter.GaussianBlur(0.6))
    mask = Image.fromarray(np.maximum(np.array(circle), np.array(drip)), "L")
    square.putalpha(mask.filter(ImageFilter.GaussianBlur(0.5)))
    return square


def drop_blue(im: Image.Image) -> Image.Image:
    """Remove stray blue ribbon slivers from a painting with no blue of its own."""
    rgba = np.array(im).astype(np.float32)
    hsv = np.array(im.convert("RGB").convert("HSV")).astype(np.float32)
    hue, sat = hsv[:, :, 0], hsv[:, :, 1]
    stray = (hue >= 120) & (hue <= 215) & (sat > 5)
    rgba[:, :, 3] = np.where(stray, 0, rgba[:, :, 3])
    return Image.fromarray(rgba.astype(np.uint8), "RGBA")


def fit(im: Image.Image, width: int) -> Image.Image:
    if im.width <= width:
        return im
    return im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)


def save_layer(im: Image.Image, name: str, width: int) -> None:
    """Transparent painted layers ship as optimised WebP (alpha preserved)."""
    im = fit(im, width)
    path = os.path.join(OUT, name)
    im.save(path, format="WEBP", quality=93, method=6)
    print(f"  {name:24} {im.size[0]}x{im.size[1]}  {os.path.getsize(path) // 1024} KB")


def save_jpg(im: Image.Image, name: str, quality: int = 88) -> None:
    im.convert("RGB").save(os.path.join(OUT, name), quality=quality, optimize=True, progressive=True)
    print(f"  {name:24} {im.size[0]}x{im.size[1]}  {os.path.getsize(os.path.join(OUT, name)) // 1024} KB")


def main() -> None:
    organise()
    print("Originals :", SRC)
    print("Derived   :", OUT)

    master = Image.open(os.path.join(SRC, "01_closed_envelope_fullscreen_9x16.png")).convert("RGB")
    print("master", master.size)

    # --- parchment texture (a clean patch of the actual envelope paper) ------
    # The painted patch carries a strong low-frequency wash; flatten it so the
    # texture tiles evenly behind a full-screen card and keep only the tooth.
    paper = flatten_paper(master.crop((300, 1130, 660, 1560)))
    save_jpg(paper, "paper.jpg", 88)

    # --- ribbon / bow / tails split on the knot ------------------------------
    save_layer(blue_cutout(master, (0, 756, 470, 932)), "ribbon-left.webp", 480)
    save_layer(blue_cutout(master, (470, 756, 941, 932)), "ribbon-right.webp", 480)
    save_layer(blue_cutout(master, (36, 622, 900, 790)), "bow.webp", 620)
    save_layer(blue_cutout(master, (60, 928, 470, 1120)), "tail-left.webp", 380)
    save_layer(blue_cutout(master, (470, 928, 900, 1120)), "tail-right.webp", 380)

    # --- wax seal ------------------------------------------------------------
    seal_box = find_seal(master)
    print("seal box", seal_box)
    save_layer(seal_cutout(master, seal_box), "seal.webp", 200)

    # --- painted props (white paper removed) ---------------------------------
    # Each supplied "separate" painting is really a crop of the sheet and still
    # carries slivers of its neighbours; the third value trims back to the subject.
    props = {
        "08_lemon_branch.png": ("lemon-branch.webp", 300, (16, 12, 250, 230), True),
        "09_bougainvillea.png": ("bougainvillea.webp", 380, (8, 16, 305, 238), False),
        "10_olive_branch.png": ("olive-branch.webp", 280, (48, 0, 178, 80), False),
        "11_lemon_tree_pot.png": ("lemon-tree.webp", 280, (12, 0, 208, 196), False),
        "12_number_one_art.png": ("number-one.webp", 220, (0, 0, 160, 180), False),
        "13_flower_arch.png": ("flower-arch.webp", 380, (10, 0, 250, 202), False),
        "14_stone_balustrade.png": ("balustrade.webp", 260, (0, 58, 172, 182), False),
        "15_beach_umbrella.png": ("umbrella.webp", 320, (6, 0, 256, 210), False),
        "16_boat.png": ("boat.webp", 260, (16, 20, 210, 204), False),
        "17_lemon_cake.png": ("cake.webp", 220, (0, 32, 154, 206), False),
        "18_seaside_wash.png": ("seaside-wash.webp", 340, (4, 0, 250, 192), False),
        "19_lantern.png": ("lantern.webp", 220, (28, 8, 142, 192), False),
    }
    for source, (name, width, crop, strip_blue) in props.items():
        im = Image.open(os.path.join(SRC, source)).crop(crop)
        if im.mode == "RGBA" and im.getchannel("A").getextrema()[0] < 250:
            layer = im.convert("RGBA")
        else:
            layer = white_to_alpha(im)
        layer = tint_paper(cut_pale_paper(layer))
        if strip_blue:
            layer = drop_blue(layer)
        save_layer(layer, name, width)

    # --- the coastal liner ---------------------------------------------------
    coast = Image.open(os.path.join(SRC, "02_riviera_scene.png")).convert("RGB")
    save_jpg(coast, "coast.jpg", 88)

    total = sum(os.path.getsize(os.path.join(OUT, n)) for n in os.listdir(OUT))
    print(f"derived total {total // 1024} KB")


if __name__ == "__main__":
    main()
