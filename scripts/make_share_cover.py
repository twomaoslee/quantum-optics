#!/usr/bin/env python3
"""Render the course's small, square share cover (requires Pillow and CJK fonts)."""
from pathlib import Path
import argparse
import math
from PIL import Image, ImageDraw, ImageFont

SITE = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--font', default='/System/Library/Fonts/STHeiti Medium.ttc')
    args = parser.parse_args()
    # Visual thesis: a quiet blue academic cover, legible as a small thumbnail.
    # Content: institution, course name, short subtitle, semester.
    # Static share artwork: no interaction or animation.
    scale = 2
    canvas = Image.new('RGB', (600*scale, 600*scale), '#f7faff')
    draw = ImageDraw.Draw(canvas)
    blue = '#07529c'
    def font(size):
        return ImageFont.truetype(args.font, size*scale)
    def centered(text, y, size, color=blue):
        draw.text((300*scale, y*scale), text, font=font(size), fill=color, anchor='mt')
    # Decorative wave lines frame the title, without suggesting measured data.
    for shift in range(5):
        points = [(x*scale, (82+shift*13+19*math.sin(x/65+shift*.2))*scale)
                  for x in range(-10, 611, 3)]
        draw.line(points, fill='#d6e4f3', width=scale*2)
    centered('中南大学 · 物理学院', 156, 22)
    centered('量子', 212, 100)
    centered('光学', 316, 100)
    centered('从光与原子理解量子世界', 448, 24)
    draw.line((242*scale, 505*scale, 358*scale, 505*scale), fill=blue, width=2*scale)
    centered('2026 秋季', 528, 22)
    output = SITE/'assets/share/quantum-optics-2026-v1.jpg'
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas = canvas.resize((600, 600), Image.Resampling.LANCZOS)
    canvas.save(output, quality=90, optimize=True, subsampling=0)
    print(f'Share cover: {output.name}, 600 × 600, {output.stat().st_size:,} bytes')

if __name__ == '__main__':
    main()
