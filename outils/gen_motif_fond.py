"""Génère le motif de fond répétable (tuile 480 x 480) en clair et en sombre."""
import sys

S = 480
OFF = [(dx, dy) for dx in (-S, 0, S) for dy in (-S, 0, S)]


def f(v):
    return ('%.1f' % v).rstrip('0').rstrip('.')


def poly(pts):
    return 'M' + 'L'.join(f(x) + ' ' + f(y) for x, y in pts) + 'Z'


def wrap(pts):
    """Répète un polygone sur les 9 tuiles voisines, garde ceux qui touchent la tuile."""
    out = ''
    for dx, dy in OFF:
        q = [(x + dx, y + dy) for x, y in pts]
        xs = [p[0] for p in q]; ys = [p[1] for p in q]
        if max(xs) < 0 or min(xs) > S or max(ys) < 0 or min(ys) > S:
            continue
        out += poly(q)
    return out


def diamond(cx, cy, r):
    return [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)]


def ring(cx, cy, r, w):
    # préfixe « E » : ce chemin utilise la règle evenodd (anneau troué)
    return 'E' + wrap(diamond(cx, cy, r)) + wrap(diamond(cx, cy, r - w * 1.414))


def band(x1, y1, x2, y2, w):
    import math
    dx, dy = x2 - x1, y2 - y1
    L = math.hypot(dx, dy)
    nx, ny = -dy / L * w / 2, dx / L * w / 2
    return wrap([(x1 + nx, y1 + ny), (x2 + nx, y2 + ny), (x2 - nx, y2 - ny), (x1 - nx, y1 - ny)])


def stair(x0, y0, n, s, sx=1):
    """Escalier : rectangles 2s x s qui descendent en diagonale (sx = 1 vers la droite, -1 vers la gauche)."""
    out = ''
    for i in range(n):
        x = x0 + i * s * sx
        if sx < 0:
            x -= s
        out += wrap([(x, y0 + i * s), (x + 2 * s, y0 + i * s), (x + 2 * s, y0 + (i + 1) * s), (x, y0 + (i + 1) * s)])
    return out


def squares(pts, s):
    return ''.join(wrap([(x, y), (x + s, y), (x + s, y + s), (x, y + s)]) for x, y in pts)


def dots(cx, cy, r, step, rad):
    """Points disposés dans un losange."""
    out = ''
    n = int(r // step)
    for i in range(-n, n + 1):
        for j in range(-n, n + 1):
            if abs(i) + abs(j) > n:
                continue
            x, y = cx + i * step, cy + j * step
            for dx, dy in OFF:
                X, Y = x + dx, y + dy
                if -rad <= X <= S + rad and -rad <= Y <= S + rad:
                    out += 'M%s %sh%sv%sh-%sz' % (f(X - rad), f(Y - rad), f(2 * rad), f(2 * rad), f(2 * rad))
    return out


def lattice(cx, cy, r, n, w):
    """Treillis à 45° : un losange plein percé de n x n petits losanges (règle evenodd)."""
    a = (2 * r - (n + 1) * w) / n
    d = 'E' + wrap(diamond(cx, cy, r))
    for i in range(n):
        for j in range(n):
            uc = -r + w + a / 2 + i * (a + w)
            vc = -r + w + a / 2 + j * (a + w)
            d += wrap(diamond(cx + (uc - vc) / 2, cy + (uc + vc) / 2, a / 2))
    return d


def build(dark):
    if dark:
        ground, ghost = '#0D0C0A', '#1C1912'
        blue, red, yellow = '#2F6FC4', '#B30F26', '#D9A60B'
    else:
        ground, ghost = '#FBF5E6', '#F1E3C2'
        blue, red, yellow = '#6AA2F2', '#E3122B', '#FFC20E'

    items = []

    class L:
        def __init__(self, c): self.c = c
        def __iadd__(self, d): items.append((self.c, d)); return self
    layers = {ghost: L(ghost), blue: L(blue), red: L(red), yellow: L(yellow)}
    # Losanges fantômes beiges, comme les aplats pâles de l'original
    layers[ghost] += wrap(diamond(120, 360, 120)) + wrap(diamond(360, 120, 105)) + wrap(diamond(240, 240, 62))

    # Bandes bleues en diagonale
    layers[blue] += band(0, 170, 170, 0, 40) + band(170, 480, 480, 170, 40)
    layers[blue] += band(250, 300, 430, 480, 34)
    layers[blue] += band(40, 0, 118, 78, 30)
    # Losange bleu central
    layers[blue] += ring(240, 240, 96, 16)
    # Treillis bleu
    layers[blue] += lattice(370, 390, 78, 5, 8)
    # Confettis bleus
    layers[blue] += squares([(300, 34), (318, 52), (452, 262), (190, 420), (66, 214)], 10)

    # Escaliers rouges
    layers[red] += stair(270, 40, 7, 20, 1)
    layers[red] += stair(150, 300, 6, 22, -1)
    # Losanges rouges emboîtés au coin
    layers[red] += ring(0, 0, 74, 10)
    layers[red] += ring(0, 240, 38, 9)
    layers[red] += wrap(diamond(0, 240, 9))
    # Points rouges
    layers[red] += dots(105, 105, 44, 11, 2.2)
    layers[red] += squares([(222, 150), (440, 330), (96, 460)], 12)

    # Jaune : losanges emboîtés, escalier, points
    layers[yellow] += ring(0, 0, 44, 10)
    layers[yellow] += ring(240, 0, 52, 13)
    layers[yellow] += wrap(diamond(240, 0, 16))
    layers[yellow] += stair(160, 170, 4, 24, 1)
    layers[yellow] += band(330, 240, 420, 150, 30)
    layers[yellow] += dots(400, 60, 36, 10, 1.9)
    layers[yellow] += ring(120, 360, 58, 12)

    def one(c, d):
        if d.startswith('E'):
            return '<path fill="%s" fill-rule="evenodd" d="%s"/>' % (c, d[1:])
        return '<path fill="%s" d="%s"/>' % (c, d)
    paths = ''.join(one(c, d) for c, d in items if d)
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">'
            '<rect width="%d" height="%d" fill="%s"/>%s</svg>') % (S, S, S, S, S, S, ground, paths)


if __name__ == '__main__':
    out = sys.argv[1]
    open(out + '/motif-fond.svg', 'w').write(build(False))
    open(out + '/motif-fond-sombre.svg', 'w').write(build(True))
