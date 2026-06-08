"""
Generates minimal placeholder PNG assets for the Expo project.
Replace these with your real brand icons before publishing.

Usage:  python scripts/generate-assets.py
"""
import struct
import zlib
import os

def create_png(width, height, r, g, b):
    """Returns raw bytes of a solid-colour RGB PNG."""
    def chunk(tag, data):
        c = tag + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xFFFFFFFF)

    signature = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    ihdr = chunk(b'IHDR', ihdr_data)

    raw_rows = b''
    row = b'\x00' + bytes([r, g, b] * width)
    raw_rows = row * height

    idat = chunk(b'IDAT', zlib.compress(raw_rows, 9))
    iend = chunk(b'IEND', b'')

    return signature + ihdr + idat + iend

ASSETS = [
    ('assets/icon.png',          512,  512),
    ('assets/splash.png',        1242, 2436),
    ('assets/adaptive-icon.png', 512,  512),
    ('assets/favicon.png',       32,   32),
]

# Purple brand colour: #6C63FF
R, G, B = 108, 99, 255

os.makedirs('assets', exist_ok=True)

for path, w, h in ASSETS:
    with open(path, 'wb') as f:
        f.write(create_png(w, h, R, G, B))
    print(f'  Created {path} ({w}x{h})')

print('\nDone! Replace these placeholders with your real artwork before publishing.')
