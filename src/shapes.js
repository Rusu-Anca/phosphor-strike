import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';

export const GREEN = 0x44ff77;

function circle(r, n = 24, cx = 0, cy = 0) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return pts;
}

function geometry(polys) {
  const pts = [];
  for (const poly of polys) {
    const n = poly.length;
    const segs = n === 2 ? 1 : n;
    for (let i = 0; i < segs; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % n];
      pts.push(a[0], a[1], 0, b[0], b[1], 0);
    }
  }
  return new LineSegmentsGeometry().setPositions(pts);
}

const square = [[-1.6, -1.6], [1.6, -1.6], [1.6, 1.6], [-1.6, 1.6]];

export const GEO = {
  player: geometry([
    [[0, 3], [0.7, 1], [2.4, -1.4], [2.4, -2.4], [0.8, -1.4], [0, -2], [-0.8, -1.4], [-2.4, -2.4], [-2.4, -1.4], [-0.7, 1]],
    [[0, 1.6], [0.4, 0.4], [-0.4, 0.4]],
  ]),
  flame: geometry([[[-0.5, -1.9], [0, -3.4], [0.5, -1.9]]]),
  drone: geometry([
    [[0, 2], [2, 0], [0, -2], [-2, 0]],
    [[0, 1], [1, 0], [0, -1], [-1, 0]],
  ]),
  fighter: geometry([
    [[0, -2.6], [1, -1], [2.8, 0.2], [2.8, 1.6], [1, 1], [0.6, 2], [-0.6, 2], [-1, 1], [-2.8, 1.6], [-2.8, 0.2], [-1, -1]],
    [[0, -0.8], [0.6, 0.6], [-0.6, 0.6]],
  ]),
  kamikaze: geometry([
    [[0, -2.4], [1.6, 1.6], [0, 0.6], [-1.6, 1.6]],
    [[0, -2.4], [0, 0.6]],
  ]),
  boss: geometry([
    [[0, -6], [4, -4], [9, -1], [10, 3], [6, 2], [4, 5], [0, 3.5], [-4, 5], [-6, 2], [-10, 3], [-9, -1], [-4, -4]],
    circle(2, 6),
    circle(1, 6),
    [[-7, 0.5], [-4, -1.5], [-2, 0]],
    [[7, 0.5], [4, -1.5], [2, 0]],
    [[-3, -4.6], [-1.5, -6.6], [-0.8, -5.4]],
    [[3, -4.6], [1.5, -6.6], [0.8, -5.4]],
  ]),
  bullet: geometry([[[0, -0.9], [0, 0.9]], [[-0.15, 0.5], [0.15, 0.5]]]),
  enemyBullet: geometry([[[0, 0.7], [0.7, 0], [0, -0.7], [-0.7, 0]]]),
  powerWeapon: geometry([square, [[0, 1], [0.8, -0.6], [-0.8, -0.6]]]),
  powerShield: geometry([square, circle(0.9, 10)]),
  powerLife: geometry([square, [[-0.9, 0], [0.9, 0]], [[0, -0.9], [0, 0.9]]]),
  circle: geometry([circle(1, 32)]),
};
