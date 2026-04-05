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
      background:    '#0B0F14',
      floorColor:    '#111827',
      floorGrid:     'rgba(34,211,238,0.04)',
      wallColor:     '#1F2933',
      wallHighlight: '#2D3F52',
      wallShadow:    '#080E14',
      wallInner:     'rgba(34,211,238,0.05)',
      accentColor:   '#22D3EE',
      hudColor:      '#22D3EE',
      hudBorder:     'rgba(34,211,238,0.22)',
      overlayClass:  'overlay-theme-0',
      wallFx:        FX.CIRCUITS,
    },
    // ── 1: CRYO VAULT — Levels 3-4 ─────────────────────────
    {
      id:            1,
      name:          'CRYO VAULT',
      flavorText:    'Cryogenic storage. Temperature: -196 °C.',
      background:    '#0B0F14',
      floorColor:    '#111827',
      floorGrid:     'rgba(147,197,253,0.05)',
      wallColor:     '#1F2933',
      wallHighlight: '#2A3D50',
      wallShadow:    '#080E14',
      wallInner:     'rgba(147,197,253,0.06)',
      accentColor:   '#7DD3FC',
      hudColor:      '#7DD3FC',
      hudBorder:     'rgba(125,211,252,0.22)',
      overlayClass:  'overlay-theme-1',
      wallFx:        FX.FROST,
    },
    // ── 2: IRON SECTOR — Levels 5-6 ────────────────────────
    {
      id:            2,
      name:          'IRON SECTOR',
      flavorText:    'Reinforced military compound. High patrol density.',
      background:    '#0B0F14',
      floorColor:    '#111827',
      floorGrid:     'rgba(163,230,53,0.05)',
      wallColor:     '#1F2933',
      wallHighlight: '#2A3520',
      wallShadow:    '#080E12',
      wallInner:     'rgba(163,230,53,0.04)',
      accentColor:   '#A3E635',
      hudColor:      '#A3E635',
      hudBorder:     'rgba(163,230,53,0.22)',
      overlayClass:  'overlay-theme-2',
      wallFx:        FX.GRATE,
    },
    // ── 3: PLASMA CORE — Levels 7-8 ────────────────────────
    {
      id:            3,
      name:          'PLASMA CORE',
      flavorText:    'Reactor containment failing. Extreme heat detected.',
      background:    '#0B0F14',
      floorColor:    '#111827',
      floorGrid:     'rgba(251,146,60,0.07)',
      wallColor:     '#1F2933',
      wallHighlight: '#38281A',
      wallShadow:    '#080E14',
      wallInner:     'rgba(251,146,60,0.07)',
      accentColor:   '#FB923C',
      hudColor:      '#FB923C',
      hudBorder:     'rgba(251,146,60,0.22)',
      overlayClass:  'overlay-theme-3',
      wallFx:        FX.PLASMA,
    },
    // ── 4: ELECTRIC GRID — Levels 9-10 ─────────────────────
    {
      id:            4,
      name:          'ELECTRIC GRID',
      flavorText:    'WARNING: All surfaces electrified. Do not touch the walls.',
      background:    '#0B0F14',
      floorColor:    '#111827',
      floorGrid:     'rgba(99,102,241,0.09)',
      wallColor:     '#1F2933',
      wallHighlight: '#1E2D4A',
      wallShadow:    '#060A14',
      wallInner:     'rgba(99,102,241,0.10)',
      accentColor:   '#818CF8',
      hudColor:      '#818CF8',
      hudBorder:     'rgba(129,140,248,0.25)',
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
