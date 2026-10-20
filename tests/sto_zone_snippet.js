(function(){const NC=window.NC;
function cellOf(v) { return Math.floor(v / CELL); }
  const isNight = () => WX.t > .8 || WX.t < .18;
  function zoneCode(x, z) {
    const i = cellOf(x), j = cellOf(z);
    if (j <= -3) return 0;
    if (j >= 3) return 4;
    const ring = Math.max(Math.abs(i), Math.abs(j));
    if (ring <= 2) return 1;
    if (i <= -2) return 2;
    return 3;
  }
  const ZN = [
    { n: 'Puerto Viejo', col: '#9a6bff', ink: '#cdbcff', line: 'rgba(154,107,255,.5)' },
    { n: 'Distrito Neón', col: '#27e6ff', ink: '#bafdff', line: 'rgba(39,230,255,.4)' },
    { n: 'Betica', col: '#ff5a7a', ink: '#ffc8d6', line: 'rgba(255,90,122,.45)' },
    { n: 'Colina Mar', col: '#ffd24a', ink: '#ffefb0', line: 'rgba(255,210,74,.45)' },
    { n: 'Fleming Sur', col: '#3dff9a', ink: '#c4ffdf', line: 'rgba(61,255,154,.5)' }
  ];
  // rect = [x, z, ancho, alto] en coordenadas del mundo; DEBE coincidir con zoneCode() (celdas -3..2 / 3..)
  //   Puerto Viejo: z < -2C   Fleming Sur: z >= 3C   Neon: x,z en [-2C, 3C)   Betica: x < -2C   Colina Mar: x >= 3C
  ZN[0].rect = [-EXT - 40, -EXT - 40, (EXT + 40) * 2, (-2 * CELL) + EXT + 40];
  ZN[4].rect = [-EXT - 40, 3 * CELL, (EXT + 40) * 2, EXT + 40 - 3 * CELL];
  ZN[1].rect = [-2 * CELL, -2 * CELL, 5 * CELL, 5 * CELL];
  ZN[2].rect = [-EXT - 40, -2 * CELL, (EXT + 40) - 2 * CELL, 5 * CELL];
  ZN[3].rect = [3 * CELL, -2 * CELL, (EXT + 40) - 3 * CELL, 5 * CELL];
  NC.sto = {
    zones: [],
    pins: [],
    note: function () { },
    zone: function (x, z) { return ZN[zoneCode(x, z)].n; },
    at: function (x, z) { return ZN[zoneCode(x, z)]; }
  };
  for (const z of ZN) NC.sto.zones.push({ label: z.n.toUpperCase(), line: z.line, ink: z.ink, rect: z.rect });
})();
