"""Gera a logo de impressão térmica (1 bit, fundo branco) a partir de public/logo-full.png.

O brasão está sobre uma foto desfocada que vai até a borda; numa térmica (só preto/branco) esse
fundo viraria uma mancha de pontos. Aqui: acha a moldura azul-marinho do brasão, apaga tudo fora
dela (exceto texto escuro que vaza da moldura, como o "SABOR DA HORA"), aumenta contraste e
aplica pontilhado Floyd-Steinberg.

Uso (precisa de Pillow e numpy):
    python scripts/make_print_logo.py public/logo-full.png logo-preview.png public/logo-print.png 320
O 4º argumento é a largura em pontos (320 ≈ 40mm numa térmica de 203dpi).
"""
import sys
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

SRC = sys.argv[1]
OUT_GRAY = sys.argv[2]   # prévia em tons de cinza (só pra conferência)
OUT_1BIT = sys.argv[3]   # arquivo final 1 bit
TARGET_WIDTH = int(sys.argv[4]) if len(sys.argv) > 4 else 320

im = Image.open(SRC).convert("RGB")
a = np.asarray(im).astype(int)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
lum = 0.299 * r + 0.587 * g + 0.114 * b
h, w = lum.shape

# Moldura azul-marinho: azul domina e é escuro.
navy = (b > r + 15) & (b > g - 5) & (lum < 120)

# Por linha: dentro do brasão = entre o primeiro e o último pixel da moldura.
inside = np.zeros((h, w), bool)
left = np.full(h, -1)
right = np.full(h, -1)
for y in range(h):
    xs = np.where(navy[y])[0]
    if len(xs) >= 2 and xs[-1] - xs[0] > w * 0.12:
        left[y], right[y] = xs[0], xs[-1]

# Linhas sem moldura visível (tampadas pela faixa de texto): interpola entre vizinhas.
valid = np.where(left >= 0)[0]
top, bottom = valid.min(), valid.max()
for y in range(top, bottom + 1):
    if left[y] < 0:
        prev = valid[valid < y].max()
        nxt = valid[valid > y].min()
        left[y] = min(left[prev], left[nxt])
        right[y] = max(right[prev], right[nxt])
    inside[y, left[y] : right[y] + 1] = True

# Fora do brasão, só sobrevive o que é forte (texto e contornos escuros) e só nas linhas onde a
# moldura some atrás da faixa "SABOR DA HORA" — no resto, o fundo vira branco.
interpolated_rows = np.zeros(h, bool)
for y in range(top, bottom + 1):
    if y not in set(valid):
        interpolated_rows[max(top, y - 8) : min(bottom, y + 8) + 1] = True
strong = (lum < 150) & interpolated_rows[:, None]
# A fita "DESDE 2024" fica pendurada abaixo da moldura, no centro.
ribbon = np.zeros((h, w), bool)
ribbon[bottom : min(h, bottom + 45), int(w * 0.3) : int(w * 0.7)] = True
strong |= (lum < 170) & ribbon
keep = inside | strong

# Níveis: tudo mais escuro que BLACK vira preto chapado (letras e contornos saem sólidos), tudo
# mais claro que WHITE vira papel; o meio fica pro pontilhado (desenhos dos salgados).
BLACK, WHITE = 120, 215
leveled = np.clip((lum - BLACK) / (WHITE - BLACK), 0, 1) ** 0.85 * 255
gray = np.where(keep, leveled, 255).astype(np.uint8)
out = Image.fromarray(gray, "L")

# Recorta as margens brancas.
bbox = Image.fromarray(np.where(gray < 200, 255, 0).astype(np.uint8)).getbbox()
out = out.crop(bbox)

# Térmica imprime escuro: clareia o meio-tom e reforça contraste antes do pontilhado.
ratio = TARGET_WIDTH / out.width
out = out.resize((TARGET_WIDTH, round(out.height * ratio)), Image.LANCZOS)
out = out.filter(ImageFilter.UnsharpMask(radius=1.2, percent=80, threshold=2))
out.save(OUT_GRAY)

one_bit = out.convert("1", dither=Image.Dither.FLOYDSTEINBERG)
one_bit.save(OUT_1BIT)
print("tamanho final:", one_bit.size, "linhas brasão:", top, bottom)
