// ── themes.js ────────────────────────────────────────────────
// Visual theme definitions — one theme per two levels.
// Themes escalate from a quiet data-centre intro through cryo
// storage, a military fortress, and a molten plasma core, up to
// the fully electrified final grid where every surface crackles.

const Themes = (() => {

  // Special-effect identifiers understood by Tilemap.draw()
  const FX = {
    NONE:     'none',
    CIRCUITS: 'circuits',  // theme 0 — cyan circuit traces on walls
    FROST:    'frost',     // theme 1 — white crystal growth on walls
    GRATE:    'grate',     // theme 2 — rivet-and-grate industrial walls
    PLASMA:   'plasma',    // theme 3 — glowing orange fracture lines
    ELECTRIC: 'electric',  // theme 4 — animated lightning arcs everywhere
  };

  const THEMES = [
    // ── 0: DATA TUNNELS — Levels 1-2 ───────────────────────
    {
      id:            0,
      name:          'DATA TUNNELS',
      flavorText:    'Outer perimeter breach. Proceed with caution.',
      background:    '#030a0e',
      floorColor:    '#0a2030',
      floorGrid:     'rgba(0,200,255,0.06)',
      wallColor:     '#122535',
      wallHighlight: '#1e3d52',
      wallShadow:    '#020810',
      wallInner:     'rgba(0,180,255,0.07)',
      accentColor:   '#00ccff',
      hudColor:      '#00ccff',
      hudBorder:     'rgba(0,204,255,0.22)',
      overlayClass:  'overlay-theme-0',
      wallFx:        FX.CIRCUITS,
    },
    // ── 1: CRYO VAULT — Levels 3-4 ─────────────────────────
    {
      id:            1,
      name:          'CRYO VAULT',
      flavorText:    'Cryogenic storage. Temperature: -196 °C.',
      background:    '#010810',
      floorColor:    '#081e2c',
      floorGrid:     'rgba(160,220,255,0.07)',
      wallColor:     '#152d42',
      wallHighlight: '#224456',
      wallShadow:    '#010710',
      wallInner:     'rgba(150,210,255,0.08)',
      accentColor:   '#88ddff',
      hudColor:      '#88ddff',
      hudBorder:     'rgba(136,221,255,0.22)',
      overlayClass:  'overlay-theme-1',
      wallFx:        FX.FROST,
    },
    // ── 2: IRON SECTOR — Levels 5-6 ────────────────────────
    {
      id:            2,
      name:          'IRON SECTOR',
      flavorText:    'Reinforced military compound. High patrol density.',
      background:    '#0c0c0c',
      floorColor:    '#1c1c18',
      floorGrid:     'rgba(140,150,100,0.08)',
      wallColor:     '#282820',
      wallHighlight: '#404030',
      wallShadow:    '#080808',
      wallInner:     'rgba(180,180,140,0.07)',
      accentColor:   '#aacc44',
      hudColor:      '#aacc44',
      hudBorder:     'rgba(170,204,68,0.22)',
      overlayClass:  'overlay-theme-2',
      wallFx:        FX.GRATE,
    },
    // ── 3: PLASMA CORE — Levels 7-8 ────────────────────────
    {
      id:            3,
      name:          'PLASMA CORE',
      flavorText:    'Reactor containment failing. Extreme heat detected.',
      background:    '#140400',
      floorColor:    '#2c1000',
      floorGrid:     'rgba(255,100,20,0.09)',
      wallColor:     '#3c1800',
      wallHighlight: '#622600',
      wallShadow:    '#0e0200',
      wallInner:     'rgba(255,80,0,0.10)',
      accentColor:   '#ff7722',
      hudColor:      '#ff7722',
      hudBorder:     'rgba(255,119,34,0.22)',
      overlayClass:  'overlay-theme-3',
      wallFx:        FX.PLASMA,
    },
    // ── 4: ELECTRIC GRID — Levels 9-10 ─────────────────────
    {
      id:            4,
      name:          'ELECTRIC GRID',
      flavorText:    'WARNING: All surfaces electrified. Do not touch the walls.',
      background:    '#000414',
      floorColor:    '#000e28',
      floorGrid:     'rgba(80,160,255,0.11)',
      wallColor:     '#001838',
      wallHighlight: '#003090',
      wallShadow:    '#000210',
      wallInner:     'rgba(60,120,255,0.12)',
      accentColor:   '#4499ff',
      hudColor:      '#4499ff',
      hudBorder:     'rgba(68,153,255,0.25)',
      overlayClass:  'overlay-theme-4',
      wallFx:        FX.ELECTRIC,
    },
  ];

  // Returns the theme for a given 0-indexed level number
  function get(levelIndex) {
    const i = Math.min(Math.floor(levelIndex / 2), THEMES.length - 1);
    return THEMES[i];
  }

  function getAll() { return THEMES; }

  return { FX, get, getAll };
})();
