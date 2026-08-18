#!/usr/bin/env python3
"""Generate 20 real NetPlus logos with distinct visual styles."""
from PIL import Image, ImageDraw, ImageFont
import math, os

OUT = "/home/z/my-project/public/logos"
SIZE = 192  # 192x192 for crisp icons

# Load fonts
try:
    FONT_BOLD = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 72)
    FONT_MED  = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 48)
    FONT_SM   = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
    FONT_TINY = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
except:
    FONT_BOLD = FONT_MED = FONT_SM = FONT_TINY = ImageFont.load_default()

def rounded_rect(draw, xy, r, fill):
    draw.rounded_rectangle(xy, radius=r, fill=fill)

def draw_n_letter(draw, cx, cy, size, color, font=None):
    """Draw a styled 'N' letter centered at (cx, cy)."""
    if font is None:
        font = FONT_BOLD
    bbox = draw.textbbox((0, 0), "N", font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = cx - tw / 2 - bbox[0]
    y = cy - th / 2 - bbox[1]
    draw.text((x, y), "N", font=font, fill=color)

def draw_film_reel(draw, cx, cy, r, color, bg_color):
    """Draw a film reel icon."""
    # Outer circle
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], outline=color, width=3)
    # Inner circle
    ir = r * 0.35
    draw.ellipse([cx-ir, cy-ir, cx+ir, cy+ir], fill=color)
    # 8 sprocket holes
    for i in range(8):
        angle = math.radians(i * 45)
        hx = cx + r * 0.7 * math.cos(angle)
        hy = cy + r * 0.7 * math.sin(angle)
        hr = r * 0.12
        draw.ellipse([hx-hr, hy-hr, hx+hr, hy+hr], fill=bg_color)

def draw_play_triangle(draw, cx, cy, size, color):
    """Draw a play button triangle."""
    s = size
    points = [(cx - s*0.4, cy - s*0.5), (cx - s*0.4, cy + s*0.5), (cx + s*0.5, cy)]
    draw.polygon(points, fill=color)

def draw_star(draw, cx, cy, r, color, points=5):
    """Draw a star shape."""
    pts = []
    for i in range(points * 2):
        angle = math.radians(-90 + i * 360 / (points * 2))
        radius = r if i % 2 == 0 else r * 0.4
        pts.append((cx + radius * math.cos(angle), cy + radius * math.sin(angle)))
    draw.polygon(pts, fill=color)

def draw_diamond(draw, cx, cy, r, color):
    pts = [(cx, cy-r), (cx+r, cy), (cx, cy+r), (cx-r, cy)]
    draw.polygon(pts, fill=color)

def draw_shield(draw, cx, cy, r, color):
    """Draw a shield/badge shape."""
    pts = [
        (cx - r, cy - r*0.8),
        (cx + r, cy - r*0.8),
        (cx + r, cy + r*0.2),
        (cx, cy + r),
        (cx - r, cy + r*0.2),
    ]
    draw.polygon(pts, fill=color)

def draw_hexagon(draw, cx, cy, r, color):
    pts = []
    for i in range(6):
        angle = math.radians(30 + i * 60)
        pts.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    draw.polygon(pts, fill=color)

def draw_clapperboard(draw, cx, cy, size, color):
    """Draw a simplified clapperboard."""
    s = size
    # Top part (slanted)
    draw.polygon([(cx-s*0.5, cy-s*0.3), (cx+s*0.5, cy-s*0.3), (cx+s*0.5, cy-s*0.05), (cx-s*0.5, cy-s*0.05)], fill=color)
    # Stripes on top
    for i in range(4):
        x1 = cx - s*0.5 + i * s*0.25
        draw.rectangle([x1, cy-s*0.3, x1+s*0.12, cy-s*0.05], fill=(0,0,0,128) if i % 2 == 0 else color)
    # Bottom part
    draw.rectangle([cx-s*0.5, cy-s*0.05, cx+s*0.5, cy+s*0.45], fill=color)

def save_logo(img, name):
    img.save(os.path.join(OUT, f"{name}.png"), "PNG")
    print(f"  ✓ {name}.png")

# ─── Logo definitions ───
logos = []

# 1. Gold Classic — Rounded square, gold N on dark
def logo_gold():
    img = Image.new("RGBA", (SIZE, SIZE), (15, 15, 35, 255))
    d = ImageDraw.Draw(img)
    rounded_rect(d, [8, 8, SIZE-8, SIZE-8], 32, (42, 35, 15, 255))
    draw_n_letter(d, SIZE//2, SIZE//2, 72, (212, 168, 67))
    save_logo(img, "gold")
logos.append(logo_gold)

# 2. Fire — Flame-like gradient, orange N
def logo_fire():
    img = Image.new("RGBA", (SIZE, SIZE), (30, 10, 5, 255))
    d = ImageDraw.Draw(img)
    # Flame shape behind
    draw_star(d, SIZE//2, SIZE//2+10, 70, (226, 88, 34, 200), 8)
    draw_n_letter(d, SIZE//2, SIZE//2, 72, (255, 220, 180))
    save_logo(img, "fire")
logos.append(logo_fire)

# 3. Ocean — Blue gradient, film reel + N
def logo_ocean():
    img = Image.new("RGBA", (SIZE, SIZE), (5, 15, 45, 255))
    d = ImageDraw.Draw(img)
    rounded_rect(d, [12, 12, SIZE-12, SIZE-12], 28, (10, 40, 90, 255))
    draw_film_reel(d, SIZE//2, SIZE//2, 60, (100, 180, 255), (5, 15, 45))
    draw_n_letter(d, SIZE//2, SIZE//2, 40, (200, 230, 255), FONT_MED)
    save_logo(img, "ocean")
logos.append(logo_ocean)

# 4. Forest — Green, leaf-like hexagon
def logo_forest():
    img = Image.new("RGBA", (SIZE, SIZE), (8, 20, 12, 255))
    d = ImageDraw.Draw(img)
    draw_hexagon(d, SIZE//2, SIZE//2, 72, (34, 120, 34, 255))
    draw_n_letter(d, SIZE//2, SIZE//2, 72, (180, 255, 180))
    save_logo(img, "forest")
logos.append(logo_forest)

# 5. Night — Deep blue, crescent moon shape
def logo_night():
    img = Image.new("RGBA", (SIZE, SIZE), (10, 10, 30, 255))
    d = ImageDraw.Draw(img)
    rounded_rect(d, [10, 10, SIZE-10, SIZE-10], 36, (15, 15, 50, 255))
    # Crescent moon
    d.ellipse([SIZE//2-50, SIZE//2-50, SIZE//2+50, SIZE//2+50], fill=(200, 200, 100, 80))
    d.ellipse([SIZE//2-30, SIZE//2-55, SIZE//2+55, SIZE//2+30], fill=(15, 15, 50, 255))
    draw_n_letter(d, SIZE//2, SIZE//2+5, 72, (220, 220, 255))
    save_logo(img, "night")
logos.append(logo_night)

# 6. Sunset — Warm gradient, play button
def logo_sunset():
    img = Image.new("RGBA", (SIZE, SIZE), (40, 15, 10, 255))
    d = ImageDraw.Draw(img)
    rounded_rect(d, [8, 8, SIZE-8, SIZE-8], 30, (60, 20, 15, 255))
    draw_play_triangle(d, SIZE//2, SIZE//2, 60, (255, 99, 71, 200))
    draw_n_letter(d, SIZE//2, SIZE//2, 40, (255, 230, 200), FONT_MED)
    save_logo(img, "sunset")
logos.append(logo_sunset)

# 7. Ice — Light blue, crystalline diamond
def logo_ice():
    img = Image.new("RGBA", (SIZE, SIZE), (180, 210, 230, 255))
    d = ImageDraw.Draw(img)
    draw_diamond(d, SIZE//2, SIZE//2, 72, (150, 200, 230, 255))
    draw_n_letter(d, SIZE//2, SIZE//2, 72, (20, 60, 100))
    save_logo(img, "ice")
logos.append(logo_ice)

# 8. Royal — Purple/blue shield
def logo_royal():
    img = Image.new("RGBA", (SIZE, SIZE), (15, 10, 40, 255))
    d = ImageDraw.Draw(img)
    draw_shield(d, SIZE//2, SIZE//2, 68, (65, 105, 225, 255))
    draw_n_letter(d, SIZE//2, SIZE//2-5, 72, (255, 255, 255))
    save_logo(img, "royal")
logos.append(logo_royal)

# 9. Emerald — Green diamond on dark
def logo_emerald():
    img = Image.new("RGBA", (SIZE, SIZE), (5, 20, 15, 255))
    d = ImageDraw.Draw(img)
    draw_diamond(d, SIZE//2, SIZE//2, 72, (80, 200, 120, 255))
    draw_n_letter(d, SIZE//2, SIZE//2, 72, (5, 40, 20))
    save_logo(img, "emerald")
logos.append(logo_emerald)

# 10. Ruby — Red on dark, star shape
def logo_ruby():
    img = Image.new("RGBA", (SIZE, SIZE), (25, 5, 10, 255))
    d = ImageDraw.Draw(img)
    draw_star(d, SIZE//2, SIZE//2, 70, (224, 17, 95, 220))
    draw_n_letter(d, SIZE//2, SIZE//2, 72, (255, 220, 230))
    save_logo(img, "ruby")
logos.append(logo_ruby)

# 11. Amber — Yellow/gold play button
def logo_amber():
    img = Image.new("RGBA", (SIZE, SIZE), (30, 20, 5, 255))
    d = ImageDraw.Draw(img)
    rounded_rect(d, [8, 8, SIZE-8, SIZE-8], 32, (50, 40, 10, 255))
    draw_play_triangle(d, SIZE//2, SIZE//2, 65, (255, 191, 0, 230))
    draw_n_letter(d, SIZE//2, SIZE//2, 40, (50, 30, 0), FONT_MED)
    save_logo(img, "amber")
logos.append(logo_amber)

# 12. Violet — Purple hexagon
def logo_violet():
    img = Image.new("RGBA", (SIZE, SIZE), (15, 5, 30, 255))
    d = ImageDraw.Draw(img)
    draw_hexagon(d, SIZE//2, SIZE//2, 72, (139, 0, 255, 200))
    draw_n_letter(d, SIZE//2, SIZE//2, 72, (230, 200, 255))
    save_logo(img, "violet")
logos.append(logo_violet)

# 13. Copper — Warm brown, film reel
def logo_copper():
    img = Image.new("RGBA", (SIZE, SIZE), (20, 12, 8, 255))
    d = ImageDraw.Draw(img)
    rounded_rect(d, [8, 8, SIZE-8, SIZE-8], 28, (40, 25, 15, 255))
    draw_film_reel(d, SIZE//2, SIZE//2, 60, (184, 115, 51), (20, 12, 8))
    draw_n_letter(d, SIZE//2, SIZE//2, 40, (255, 220, 180), FONT_MED)
    save_logo(img, "copper")
logos.append(logo_copper)

# 14. Silver — Metallic, sleek shield
def logo_silver():
    img = Image.new("RGBA", (SIZE, SIZE), (20, 20, 25, 255))
    d = ImageDraw.Draw(img)
    draw_shield(d, SIZE//2, SIZE//2, 68, (160, 165, 175, 255))
    draw_n_letter(d, SIZE//2, SIZE//2-5, 72, (240, 240, 245))
    save_logo(img, "silver")
logos.append(logo_silver)

# 15. Platinum — White/silver, minimalist circle
def logo_platinum():
    img = Image.new("RGBA", (SIZE, SIZE), (18, 18, 22, 255))
    d = ImageDraw.Draw(img)
    d.ellipse([SIZE//2-68, SIZE//2-68, SIZE//2+68, SIZE//2+68], fill=(200, 200, 205, 255))
    draw_n_letter(d, SIZE//2, SIZE//2, 72, (30, 30, 40))
    save_logo(img, "platinum")
logos.append(logo_platinum)

# 16. Crimson — Bold red, clapperboard
def logo_crimson():
    img = Image.new("RGBA", (SIZE, SIZE), (30, 8, 8, 255))
    d = ImageDraw.Draw(img)
    rounded_rect(d, [8, 8, SIZE-8, SIZE-8], 28, (60, 15, 15, 255))
    draw_clapperboard(d, SIZE//2, SIZE//2, 55, (220, 20, 60, 230))
    draw_n_letter(d, SIZE//2, SIZE//2+10, 40, (255, 200, 200), FONT_MED)
    save_logo(img, "crimson")
logos.append(logo_crimson)

# 17. Teal — Teal circle, minimalist
def logo_teal():
    img = Image.new("RGBA", (SIZE, SIZE), (5, 20, 25, 255))
    d = ImageDraw.Draw(img)
    d.ellipse([SIZE//2-68, SIZE//2-68, SIZE//2+68, SIZE//2+68], fill=(0, 128, 128, 255))
    draw_n_letter(d, SIZE//2, SIZE//2, 72, (200, 255, 255))
    save_logo(img, "teal")
logos.append(logo_teal)

# 18. Rose — Pink, heart-like
def logo_rose():
    img = Image.new("RGBA", (SIZE, SIZE), (25, 8, 18, 255))
    d = ImageDraw.Draw(img)
    rounded_rect(d, [8, 8, SIZE-8, SIZE-8], 32, (45, 10, 30, 255))
    # Stylized heart shape (simplified)
    draw_star(d, SIZE//2, SIZE//2+5, 65, (255, 0, 127, 200), 5)
    draw_n_letter(d, SIZE//2, SIZE//2, 72, (255, 200, 220))
    save_logo(img, "rose")
logos.append(logo_rose)

# 19. Indigo — Dark indigo, neon glow
def logo_indigo():
    img = Image.new("RGBA", (SIZE, SIZE), (10, 5, 25, 255))
    d = ImageDraw.Draw(img)
    # Glow effect (larger faint circle behind)
    d.ellipse([SIZE//2-72, SIZE//2-72, SIZE//2+72, SIZE//2+72], fill=(75, 0, 130, 100))
    d.ellipse([SIZE//2-60, SIZE//2-60, SIZE//2+60, SIZE//2+60], fill=(100, 20, 180, 180))
    draw_n_letter(d, SIZE//2, SIZE//2, 72, (200, 180, 255))
    save_logo(img, "indigo")
logos.append(logo_indigo)

# 20. Graphite — Dark, sleek, cinematic
def logo_graphite():
    img = Image.new("RGBA", (SIZE, SIZE), (25, 25, 28, 255))
    d = ImageDraw.Draw(img)
    rounded_rect(d, [8, 8, SIZE-8, SIZE-8], 32, (40, 40, 45, 255))
    # Film strip lines on sides
    for i in range(6):
        y = 20 + i * 26
        d.rectangle([14, y, 28, y+14], fill=(80, 80, 90, 255))
        d.rectangle([SIZE-28, y, SIZE-14, y+14], fill=(80, 80, 90, 255))
    draw_n_letter(d, SIZE//2, SIZE//2, 72, (200, 200, 210))
    save_logo(img, "graphite")
logos.append(logo_graphite)

# ─── Generate all logos ───
print("Generating 20 NetPlus logos...")
for fn in logos:
    fn()
print(f"\nDone! All logos saved to {OUT}/")
