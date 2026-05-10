/**
 * RankBorder — Renders the tier-appropriate SVG ring around a user's avatar.
 *
 * Props:
 *   tier         — one of the 7 rank tiers
 *   subdivision  — 1 (I) through 4 (IV)
 *   theme        — visual theme (defaults to 'original')
 *   size         — outer diameter in px (default 200; also works cleanly at 48)
 *   children     — the avatar / profile picture to display inside the ring
 *
 * Theme swap guide (when artwork is ready):
 *   1. Add assets to assets/themes/<theme-slug>/border.png (transparent PNG, same size)
 *   2. In the "Theme overlay" section below, replace the <View> tint with:
 *        <Image source={require(`../../assets/themes/${theme}/border.png`)}
 *               style={{ position:'absolute', width:size, height:size }} />
 */
import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import type { RankTier, RankSubdivision, RankTheme } from '../../types/rank.types';
import {
  TIER_VISUALS,
  SUBDIVISION_LABELS,
  GRAND_SAGE_CARDINAL_GEMS,
  type TierVisualConfig,
} from '../../constants/ranks';

// ─── Public interface ─────────────────────────────────────────────────────────

interface RankBorderProps {
  tier: RankTier;
  subdivision: RankSubdivision;
  theme?: RankTheme;
  size?: number;
  children?: React.ReactNode;
}

// ─── Internal renderer props (shared by all tier functions) ───────────────────

interface RP {
  cx: number;
  cy: number;
  outerR: number;
  s: number; // linear scale factor (size / 200)
  v: TierVisualConfig;
}

// ─── Geometry helper ──────────────────────────────────────────────────────────

/** Point on a circle. angleDeg=0 → top (12 o'clock), increases clockwise. */
function poc(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// ─── Tier renderers ───────────────────────────────────────────────────────────

function PageTurnerRing({ cx, cy, outerR, s, v }: RP) {
  const rw   = 8 * s;
  const rMid = outerR - rw / 2;
  const ticks = Array.from({ length: 8 }, (_, i) => i * 45);

  return (
    <>
      {/* Main iron ring */}
      <Circle cx={cx} cy={cy} r={rMid} strokeWidth={rw} stroke={v.primary} fill="none" />
      {/* Inner highlight */}
      <Circle cx={cx} cy={cy} r={rMid} strokeWidth={rw - 2 * s} stroke={v.accent} fill="none" opacity={0.25} />
      {/* 8 engraved tick marks */}
      {ticks.map((a) => {
        const o = poc(cx, cy, rMid + rw * 0.4, a);
        const i = poc(cx, cy, rMid - rw * 0.4, a);
        return <Line key={a} x1={o.x} y1={o.y} x2={i.x} y2={i.y} stroke={v.secondary} strokeWidth={1 * s} />;
      })}
      {/* Raised pip at top */}
      {(() => { const p = poc(cx, cy, rMid, 0); return <Circle cx={p.x} cy={p.y} r={3.5 * s} fill={v.accent} />; })()}
    </>
  );
}

function ChallengerRing({ cx, cy, outerR, s, v }: RP) {
  const rw      = 11 * s;
  const rMid    = outerR - rw / 2;
  const cardinals = [0, 90, 180, 270];
  // Texture ticks every 15°, excluding cardinals
  const texture = Array.from({ length: 24 }, (_, i) => i * 15).filter(
    (a) => !cardinals.includes(a),
  );

  return (
    <>
      {/* Bronze ring */}
      <Circle cx={cx} cy={cy} r={rMid} strokeWidth={rw} stroke={v.primary} fill="none" />
      {/* Outer rim highlight */}
      <Circle cx={cx} cy={cy} r={rMid + rw * 0.42} strokeWidth={1.5 * s} stroke={v.accent} fill="none" opacity={0.5} />
      {/* Inner shadow */}
      <Circle cx={cx} cy={cy} r={rMid - rw * 0.42} strokeWidth={1.5 * s} stroke={v.secondary} fill="none" />
      {/* Surface texture ticks */}
      {texture.map((a) => {
        const p1 = poc(cx, cy, rMid + rw * 0.3, a);
        const p2 = poc(cx, cy, rMid - rw * 0.3, a);
        return <Line key={a} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={v.secondary} strokeWidth={0.8 * s} opacity={0.55} />;
      })}
      {/* Cardinal notch cuts */}
      {cardinals.map((a) => {
        const p1 = poc(cx, cy, rMid + rw * 0.45, a);
        const p2 = poc(cx, cy, rMid - rw * 0.45, a);
        return <Line key={a} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={v.secondary} strokeWidth={3 * s} />;
      })}
    </>
  );
}

function BookwormRing({ cx, cy, outerR, s, v }: RP) {
  const outerW = 6 * s;
  const gapW   = 2 * s;
  const innerW = 4 * s;
  const outerMid = outerR - outerW / 2;
  const gapMid   = outerR - outerW - gapW / 2;
  const innerMid = outerR - outerW - gapW - innerW / 2;

  return (
    <>
      {/* Outer silver band */}
      <Circle cx={cx} cy={cy} r={outerMid} strokeWidth={outerW} stroke={v.primary} fill="none" />
      {/* Dark gap */}
      <Circle cx={cx} cy={cy} r={gapMid} strokeWidth={gapW} stroke={v.gapColor} fill="none" />
      {/* Inner silver band */}
      <Circle cx={cx} cy={cy} r={innerMid} strokeWidth={innerW} stroke={v.secondary} fill="none" />
      {/* Engraved pattern on outer band — tick every 30° */}
      {Array.from({ length: 12 }, (_, i) => i * 30).map((a) => {
        const p1 = poc(cx, cy, outerMid + outerW * 0.38, a);
        const p2 = poc(cx, cy, outerMid - outerW * 0.38, a);
        return <Line key={a} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={v.secondary} strokeWidth={1 * s} opacity={0.65} />;
      })}
      {/* Diagonal accent dots on inner band */}
      {[45, 135, 225, 315].map((a) => {
        const p = poc(cx, cy, innerMid, a);
        return <Circle key={a} cx={p.x} cy={p.y} r={3 * s} fill={v.accent} />;
      })}
    </>
  );
}

function ScholarRing({ cx, cy, outerR, s, v }: RP) {
  const outerW  = 10 * s;
  const gapW    = 2 * s;
  const accentW = 3 * s;
  const outerMid  = outerR - outerW / 2;
  const gapMid    = outerR - outerW - gapW / 2;
  const accentMid = outerR - outerW - gapW - accentW / 2;
  const gemR      = 5 * s;

  return (
    <>
      {/* Main purple ring */}
      <Circle cx={cx} cy={cy} r={outerMid} strokeWidth={outerW} stroke={v.primary} fill="none" />
      {/* Purple glow layer */}
      <Circle cx={cx} cy={cy} r={outerMid} strokeWidth={outerW - 2 * s} stroke={v.accent} fill="none" opacity={0.18} />
      {/* Dark gap */}
      <Circle cx={cx} cy={cy} r={gapMid} strokeWidth={gapW} stroke={v.gapColor} fill="none" />
      {/* Inner accent band */}
      <Circle cx={cx} cy={cy} r={accentMid} strokeWidth={accentW} stroke={v.accent} fill="none" opacity={0.75} />
      {/* 16 geometric facet ticks */}
      {Array.from({ length: 16 }, (_, i) => (i * 360) / 16).map((a) => {
        const p1 = poc(cx, cy, outerMid + outerW * 0.42, a);
        const p2 = poc(cx, cy, outerMid - outerW * 0.42, a);
        return <Line key={a} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={v.secondary} strokeWidth={1 * s} opacity={0.5} />;
      })}
      {/* Top gem inset */}
      {(() => {
        const p = poc(cx, cy, outerMid, 0);
        return (
          <>
            <Circle cx={p.x} cy={p.y} r={gemR + 2 * s} fill={v.secondary} />
            <Circle cx={p.x} cy={p.y} r={gemR} fill={v.gemColor ?? v.accent} />
            <Circle cx={p.x} cy={p.y} r={gemR * 0.45} fill={v.accent} opacity={0.55} />
          </>
        );
      })()}
    </>
  );
}

function LiteratiRing({ cx, cy, outerR, s, v }: RP) {
  const outerW = 7 * s;
  const gap1W  = 2 * s;
  const midW   = 5 * s;
  const gap2W  = 2 * s;
  const innerW = 4 * s;

  const outerMid = outerR - outerW / 2;
  const gap1Mid  = outerR - outerW - gap1W / 2;
  const midMid   = outerR - outerW - gap1W - midW / 2;
  const gap2Mid  = outerR - outerW - gap1W - midW - gap2W / 2;
  const innerMid = outerR - outerW - gap1W - midW - gap2W - innerW / 2;
  const gemR     = 5.5 * s;

  return (
    <>
      {/* Outer gold band */}
      <Circle cx={cx} cy={cy} r={outerMid} strokeWidth={outerW} stroke={v.primary} fill="none" />
      {/* Outer rim highlight */}
      <Circle cx={cx} cy={cy} r={outerMid + outerW * 0.4} strokeWidth={1.5 * s} stroke={v.accent} fill="none" opacity={0.6} />
      {/* Gap 1 */}
      <Circle cx={cx} cy={cy} r={gap1Mid} strokeWidth={gap1W} stroke={v.gapColor} fill="none" />
      {/* Middle band */}
      <Circle cx={cx} cy={cy} r={midMid} strokeWidth={midW} stroke={v.secondary} fill="none" />
      {/* Gap 2 */}
      <Circle cx={cx} cy={cy} r={gap2Mid} strokeWidth={gap2W} stroke={v.gapColor} fill="none" />
      {/* Inner band */}
      <Circle cx={cx} cy={cy} r={innerMid} strokeWidth={innerW} stroke={v.primary} fill="none" />
      {/* Faceted outer — 24 ticks every 15° */}
      {Array.from({ length: 24 }, (_, i) => i * 15).map((a) => {
        const p1 = poc(cx, cy, outerMid + outerW * 0.4, a);
        const p2 = poc(cx, cy, outerMid - outerW * 0.4, a);
        return <Line key={a} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={v.secondary} strokeWidth={1 * s} opacity={0.45} />;
      })}
      {/* 4 cardinal gem insets on outer band */}
      {[0, 90, 180, 270].map((a) => {
        const p = poc(cx, cy, outerMid, a);
        return (
          <React.Fragment key={a}>
            <Circle cx={p.x} cy={p.y} r={gemR + 2 * s} fill={v.secondary} />
            <Circle cx={p.x} cy={p.y} r={gemR} fill={v.accent} />
            <Circle cx={p.x} cy={p.y} r={gemR * 0.38} fill="#FFFFFF" opacity={0.65} />
          </React.Fragment>
        );
      })}
    </>
  );
}

function SageRing({ cx, cy, outerR, s, v }: RP) {
  // 4-band layout
  let r = outerR;
  const outerW = 6 * s;  const g1W = 1.5 * s; const m1W = 4 * s;
  const g2W = 1.5 * s;   const m2W = 3 * s;
  const g3W = 1.5 * s;   const innerW = 3 * s;

  const outerMid = r - outerW / 2;  r -= outerW;
  const g1Mid    = r - g1W / 2;     r -= g1W;
  const m1Mid    = r - m1W / 2;     r -= m1W;
  const g2Mid    = r - g2W / 2;     r -= g2W;
  const m2Mid    = r - m2W / 2;     r -= m2W;
  const g3Mid    = r - g3W / 2;     r -= g3W;
  const innerMid = r - innerW / 2;

  const rubyR = 7 * s;
  const topGem = poc(cx, cy, outerMid, 0);

  // Dense detail ticks — avoid cardinal and diagonal angles where gems would sit
  const detailTicks = Array.from({ length: 36 }, (_, i) => i * 10).filter(
    (a) => ![0, 45, 90, 135, 180, 225, 270, 315].includes(a),
  );

  return (
    <>
      <Circle cx={cx} cy={cy} r={outerMid} strokeWidth={outerW} stroke={v.primary} fill="none" />
      <Circle cx={cx} cy={cy} r={g1Mid}    strokeWidth={g1W}    stroke={v.gapColor} fill="none" />
      <Circle cx={cx} cy={cy} r={m1Mid}    strokeWidth={m1W}    stroke={v.secondary} fill="none" />
      <Circle cx={cx} cy={cy} r={g2Mid}    strokeWidth={g2W}    stroke={v.gapColor} fill="none" />
      <Circle cx={cx} cy={cy} r={m2Mid}    strokeWidth={m2W}    stroke={v.primary} fill="none" opacity={0.8} />
      <Circle cx={cx} cy={cy} r={g3Mid}    strokeWidth={g3W}    stroke={v.gapColor} fill="none" />
      <Circle cx={cx} cy={cy} r={innerMid} strokeWidth={innerW} stroke={v.accent} fill="none" opacity={0.6} />
      {/* Dense engraved detail on outer band */}
      {detailTicks.map((a) => {
        const p1 = poc(cx, cy, outerMid + outerW * 0.38, a);
        const p2 = poc(cx, cy, outerMid - outerW * 0.38, a);
        return <Line key={a} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={v.secondary} strokeWidth={0.7 * s} opacity={0.45} />;
      })}
      {/* Prominent ruby gem at top */}
      <Circle cx={topGem.x} cy={topGem.y} r={rubyR + 2.5 * s} fill={v.secondary} />
      <Circle cx={topGem.x} cy={topGem.y} r={rubyR}            fill={v.gemColor ?? '#FF0000'} />
      <Circle cx={topGem.x} cy={topGem.y} r={rubyR * 0.42}     fill="#FF9999" opacity={0.65} />
    </>
  );
}

function GrandSageRing({ cx, cy, outerR, s, v }: RP) {
  let r = outerR;
  const outerW = 8 * s; const g1W = 2 * s;
  const midW   = 7 * s; const g2W = 2 * s;
  const innerW = 5 * s;

  const outerMid = r - outerW / 2; r -= outerW;
  const g1Mid    = r - g1W / 2;    r -= g1W;
  const midMid   = r - midW / 2;   r -= midW;
  const g2Mid    = r - g2W / 2;    r -= g2W;
  const innerMid = r - innerW / 2;

  const cardinalGems = [
    { a: 0,   color: GRAND_SAGE_CARDINAL_GEMS.top    },
    { a: 90,  color: GRAND_SAGE_CARDINAL_GEMS.right  },
    { a: 180, color: GRAND_SAGE_CARDINAL_GEMS.bottom },
    { a: 270, color: GRAND_SAGE_CARDINAL_GEMS.left   },
  ];
  const diagonals  = [45, 135, 225, 315];
  // 16 facet ticks on outer, skip cardinal gem positions
  const facetTicks = Array.from({ length: 16 }, (_, i) => i * 22.5).filter(
    (a) => ![0, 90, 180, 270].includes(a),
  );
  // 8 segments on middle band
  const midSegs = [0, 45, 90, 135, 180, 225, 270, 315];

  const bigR   = 7 * s;
  const smallR = 3.5 * s;

  return (
    <>
      {/* ── Three bands ── */}
      <Circle cx={cx} cy={cy} r={outerMid} strokeWidth={outerW} stroke={v.primary} fill="none" />
      {/* Outer rim highlight */}
      <Circle cx={cx} cy={cy} r={outerMid + outerW * 0.42} strokeWidth={1.5 * s} stroke={v.accent} fill="none" opacity={0.7} />
      <Circle cx={cx} cy={cy} r={g1Mid}    strokeWidth={g1W}    stroke={v.gapColor} fill="none" />
      <Circle cx={cx} cy={cy} r={midMid}   strokeWidth={midW}   stroke={v.secondary} fill="none" />
      <Circle cx={cx} cy={cy} r={g2Mid}    strokeWidth={g2W}    stroke={v.gapColor} fill="none" />
      <Circle cx={cx} cy={cy} r={innerMid} strokeWidth={innerW} stroke={v.primary} fill="none" />

      {/* ── 16 facet ticks on outer ── */}
      {facetTicks.map((a) => {
        const p1 = poc(cx, cy, outerMid + outerW * 0.42, a);
        const p2 = poc(cx, cy, outerMid - outerW * 0.42, a);
        return <Line key={a} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={v.secondary} strokeWidth={1.5 * s} opacity={0.55} />;
      })}

      {/* ── Segmented engraved middle band ── */}
      {midSegs.map((a) => {
        const p1 = poc(cx, cy, midMid + midW * 0.42, a);
        const p2 = poc(cx, cy, midMid - midW * 0.42, a);
        return <Line key={a} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke={v.gapColor} strokeWidth={2 * s} />;
      })}

      {/* ── 4 large cardinal gem insets on outer band ── */}
      {cardinalGems.map(({ a, color }) => {
        const p = poc(cx, cy, outerMid, a);
        return (
          <React.Fragment key={a}>
            <Circle cx={p.x} cy={p.y} r={bigR + 2.5 * s} fill={v.secondary} />
            <Circle cx={p.x} cy={p.y} r={bigR}            fill={color} />
            <Circle cx={p.x} cy={p.y} r={bigR * 0.38}     fill="#FFFFFF" opacity={0.45} />
          </React.Fragment>
        );
      })}

      {/* ── 4 small gold accent gems on inner band at diagonals ── */}
      {diagonals.map((a) => {
        const p = poc(cx, cy, innerMid, a);
        return (
          <React.Fragment key={a}>
            <Circle cx={p.x} cy={p.y} r={smallR + 1.5 * s} fill={v.secondary} />
            <Circle cx={p.x} cy={p.y} r={smallR}            fill={v.primary} />
          </React.Fragment>
        );
      })}
    </>
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

function renderTierRing(tier: RankTier, props: RP): React.ReactNode {
  switch (tier) {
    case 'page_turner': return <PageTurnerRing {...props} />;
    case 'challenger':  return <ChallengerRing {...props} />;
    case 'bookworm':    return <BookwormRing   {...props} />;
    case 'scholar':     return <ScholarRing    {...props} />;
    case 'literati':    return <LiteratiRing   {...props} />;
    case 'sage':        return <SageRing       {...props} />;
    case 'grand_sage':  return <GrandSageRing  {...props} />;
  }
}

// ─── Theme overlay tints ──────────────────────────────────────────────────────
// These placeholder tints will be replaced with real image assets.
// See swap guide in the file-level comment above.

const THEME_TINTS: Partial<Record<RankTheme, string>> = {
  fantasy:              'rgba(147,  51, 234, 0.14)',
  sci_fi:               'rgba(  6, 182, 212, 0.14)',
  romance:              'rgba(236,  72, 153, 0.14)',
  grand_sage_exclusive: 'rgba(255, 215,   0, 0.20)',
};

// ─── Main component ───────────────────────────────────────────────────────────

export function RankBorder({
  tier,
  subdivision,
  theme = 'original',
  size = 200,
  children,
}: RankBorderProps) {
  const v    = TIER_VISUALS[tier];
  const s    = size / 200;
  const cx   = size / 2;
  const cy   = size / 2;
  // Inset by ~1 scaled px so stroke edge stays within View bounds
  const outerR = size / 2 - 1.5 * s;

  const avatarSize   = Math.round(size * v.avatarRatio);
  const avatarOffset = (size - avatarSize) / 2;

  const badgeW    = Math.max(20, 28 * s);
  const badgeH    = Math.max(13, 16 * s);
  const fontSize  = Math.max(7, 10 * s);
  const showBadge = size >= 56;

  return (
    <View style={{ width: size, height: size }}>
      {/* ── Avatar area clipped to circle ── */}
      {children ? (
        <View
          style={{
            position: 'absolute',
            top: avatarOffset, left: avatarOffset,
            width: avatarSize,  height: avatarSize,
            borderRadius: avatarSize / 2,
            overflow: 'hidden',
            zIndex: 1,
          }}
        >
          {children}
        </View>
      ) : null}

      {/* ── SVG ring border ── */}
      <Svg width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
        {renderTierRing(tier, { cx, cy, outerR, s, v })}
      </Svg>

      {/* ── Theme overlay (placeholder tint; swap for Image when artwork is ready) ── */}
      {theme !== 'original' && THEME_TINTS[theme] ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: avatarOffset, left: avatarOffset,
            width: avatarSize, height: avatarSize,
            borderRadius: avatarSize / 2,
            backgroundColor: THEME_TINTS[theme],
            zIndex: 2,
          }}
        />
      ) : null}

      {/* ── Subdivision pill badge ── */}
      {showBadge ? (
        <View
          style={{
            position: 'absolute',
            bottom: 2 * s,
            left: cx - badgeW / 2,
            width: badgeW, height: badgeH,
            borderRadius: badgeH / 2,
            backgroundColor: v.primary,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 3,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.55,
            shadowRadius: 2,
            elevation: 4,
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize,
              fontWeight: '900',
              letterSpacing: 0.5,
              includeFontPadding: false,
            }}
          >
            {SUBDIVISION_LABELS[subdivision]}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
