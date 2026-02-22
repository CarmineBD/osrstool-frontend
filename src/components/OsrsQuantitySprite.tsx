import { cn } from "@/lib/utils";
import qtySpriteUrl from "@/assets/sprites/osrs-qty-sprite.png";

type OsrsQuantityColor = "yellow" | "white" | "green";

interface OsrsQuantitySpriteProps {
  text: string;
  color?: OsrsQuantityColor;
  scale?: number;
  className?: string;
}

interface GlyphMetric {
  x: number;
  width: number;
}

const CHARSET = "0123456789kMB.";
const ROW_HEIGHT = 9;
const ROW_Y: Record<OsrsQuantityColor, number> = {
  yellow: 0,
  white: 10,
  green: 20,
};
const GLYPH_GAP = 1;
const NO_RIGHT_GAP_CHARS = new Set(["1", "4"]);
const SPRITE_WIDTH = 88;
const SPRITE_HEIGHT = 29;
const GLYPH_X = [0, 7, 12, 19, 25, 31, 37, 44, 50, 57, 64, 71, 79, 86];
const GLYPH_WIDTH = [6, 4, 6, 5, 5, 5, 6, 5, 6, 6, 6, 7, 6, 2];

const glyphMetrics = CHARSET.split("").reduce<Record<string, GlyphMetric>>(
  (acc, character, index) => {
    acc[character] = { x: GLYPH_X[index], width: GLYPH_WIDTH[index] };
    return acc;
  },
  {}
);

export function OsrsQuantitySprite({
  text,
  color = "yellow",
  scale = 1,
  className,
}: OsrsQuantitySpriteProps) {
  const rowY = ROW_Y[color];
  const normalizedScale = Number.isFinite(scale) && scale > 0 ? Math.floor(scale) : 1;
  const value = text.trim();
  const characters = value.split("");
  const hasUnknownCharacter = characters.some((character) => !glyphMetrics[character]);

  if (!value) return null;

  if (hasUnknownCharacter) {
    return (
      <span className={cn("inline-block leading-none text-yellow-300", className)}>
        {value}
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={value}
      className={cn("inline-flex items-start", className)}
      style={{ height: `${ROW_HEIGHT * normalizedScale}px` }}
    >
      {characters.map((character, index) => {
        const metric = glyphMetrics[character]!;
        const isLastCharacter = index === characters.length - 1;
        const shouldApplyRightGap =
          !isLastCharacter && !NO_RIGHT_GAP_CHARS.has(character);

        return (
          <span
            key={`${character}-${index}`}
            aria-hidden="true"
            className="inline-block shrink-0 [image-rendering:pixelated]"
            style={{
              width: `${metric.width * normalizedScale}px`,
              height: `${ROW_HEIGHT * normalizedScale}px`,
              marginRight: shouldApplyRightGap
                ? `${GLYPH_GAP * normalizedScale}px`
                : undefined,
              backgroundImage: `url(${qtySpriteUrl})`,
              backgroundPosition: `-${metric.x * normalizedScale}px -${rowY * normalizedScale}px`,
              backgroundSize: `${SPRITE_WIDTH * normalizedScale}px ${SPRITE_HEIGHT * normalizedScale}px`,
              backgroundRepeat: "no-repeat",
            }}
          />
        );
      })}
    </span>
  );
}

export default OsrsQuantitySprite;
