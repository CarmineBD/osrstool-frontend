import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import { cn, formatNumber } from "@/lib/utils";

const BASE_ANIMATION_MS = 180;
const STEP_ANIMATION_MS = 90;
const MAX_ANIMATION_MS = 900;
const SWAP_ANIMATION_MS = 360;
const ANIMATION_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

type Direction = "up" | "down";

type StaticSegment = {
  kind: "static";
  key: string;
  value: string;
};

type DigitSegment = {
  kind: "digit";
  key: string;
  direction: Direction;
  sequence: string[];
  durationMs: number;
};

type Segment = StaticSegment | DigitSegment;

type PlainState = {
  kind: "plain";
  text: string;
};

type SegmentsState = {
  kind: "segments";
  id: number;
  text: string;
  segments: Segment[];
  active: boolean;
};

type SwapState = {
  kind: "swap";
  id: number;
  text: string;
  previousText: string;
  nextText: string;
  direction: Direction;
  active: boolean;
};

type AnimationState = PlainState | SegmentsState | SwapState;

export interface AnimatedProfitValueProps
  extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  value?: number | null;
  fallback?: string;
  prefix?: string;
  suffix?: string;
}

function isDigit(character: string): boolean {
  return /^\d$/.test(character);
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function getDirection(
  previousValue: number | null | undefined,
  nextValue: number | null | undefined,
): Direction {
  if (isFiniteNumber(previousValue) && isFiniteNumber(nextValue)) {
    return nextValue < previousValue ? "up" : "down";
  }

  return "down";
}

function supportsDigitRoll(previousText: string, nextText: string): boolean {
  if (previousText.length !== nextText.length) {
    return false;
  }

  for (let index = 0; index < previousText.length; index += 1) {
    const previousCharacter = previousText[index];
    const nextCharacter = nextText[index];
    const previousIsDigit = isDigit(previousCharacter);
    const nextIsDigit = isDigit(nextCharacter);

    if (previousIsDigit !== nextIsDigit) {
      return false;
    }

    if (!previousIsDigit && previousCharacter !== nextCharacter) {
      return false;
    }
  }

  return true;
}

function buildDigitSequence(
  previousDigit: string,
  nextDigit: string,
  direction: Direction,
): string[] {
  const sequence = [previousDigit];
  let currentDigit = Number(previousDigit);
  const targetDigit = Number(nextDigit);

  while (currentDigit !== targetDigit && sequence.length < 11) {
    currentDigit =
      direction === "down"
        ? (currentDigit + 1) % 10
        : (currentDigit + 9) % 10;
    sequence.push(String(currentDigit));
  }

  return sequence;
}

function getSegmentDurationMs(sequenceLength: number): number {
  return Math.min(
    MAX_ANIMATION_MS,
    BASE_ANIMATION_MS + Math.max(0, sequenceLength - 1) * STEP_ANIMATION_MS,
  );
}

function buildSegments(
  previousText: string,
  nextText: string,
  direction: Direction,
): Segment[] {
  return nextText.split("").map((nextCharacter, index) => {
    const previousCharacter = previousText[index];

    if (!isDigit(nextCharacter) || previousCharacter === nextCharacter) {
      return {
        kind: "static",
        key: `segment-${index}-${nextCharacter}`,
        value: nextCharacter,
      };
    }

    const sequence = buildDigitSequence(
      previousCharacter,
      nextCharacter,
      direction,
    );

    return {
      kind: "digit",
      key: `segment-${index}-${previousCharacter}-${nextCharacter}`,
      direction,
      sequence,
      durationMs: getSegmentDurationMs(sequence.length),
    };
  });
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getText(value: number | null | undefined, fallback: string): string {
  return isFiniteNumber(value) ? formatNumber(value) : fallback;
}

function renderDigitSegment(segment: DigitSegment, active: boolean) {
  const renderedSequence =
    segment.direction === "down"
      ? [...segment.sequence].reverse()
      : segment.sequence;
  const offset = renderedSequence.length - 1;
  const transform =
    segment.direction === "down"
      ? active
        ? "translateY(0em)"
        : `translateY(-${offset}em)`
      : active
        ? `translateY(-${offset}em)`
        : "translateY(0em)";

  return (
    <span
      key={segment.key}
      className="relative inline-flex h-[1em] overflow-hidden align-middle"
      data-profit-direction={segment.direction}
      data-profit-sequence={segment.sequence.join("")}
    >
      <span
        className="flex flex-col leading-none will-change-transform motion-reduce:transition-none"
        style={{
          transform,
          transitionDuration: `${segment.durationMs}ms`,
          transitionTimingFunction: ANIMATION_EASING,
        }}
      >
        {renderedSequence.map((digit, index) => (
          <span
            key={`${segment.key}-${digit}-${index}`}
            className="block h-[1em] leading-none"
          >
            {digit}
          </span>
        ))}
      </span>
    </span>
  );
}

function renderVisualState(state: AnimationState) {
  if (state.kind === "plain") {
    return <span className="whitespace-nowrap">{state.text}</span>;
  }

  if (state.kind === "segments") {
    return (
      <span
        className="inline-flex whitespace-nowrap"
        data-profit-transition="digits"
      >
        {state.segments.map((segment) =>
          segment.kind === "digit" ? (
            renderDigitSegment(segment, state.active)
          ) : (
            <span key={segment.key} className="inline-flex h-[1em] items-center">
              {segment.value}
            </span>
          ),
        )}
      </span>
    );
  }

  const previousTransform =
    state.direction === "down"
      ? state.active
        ? "translateY(1em)"
        : "translateY(0em)"
      : state.active
        ? "translateY(-1em)"
        : "translateY(0em)";
  const nextTransform =
    state.direction === "down"
      ? state.active
        ? "translateY(0em)"
        : "translateY(-1em)"
      : state.active
        ? "translateY(0em)"
        : "translateY(1em)";

  return (
    <span
      className="relative inline-grid h-[1em] overflow-hidden whitespace-nowrap"
      data-profit-direction={state.direction}
      data-profit-transition="swap"
    >
      <span
        className="col-start-1 row-start-1 leading-none will-change-transform motion-reduce:transition-none"
        style={{
          transform: previousTransform,
          transitionDuration: `${SWAP_ANIMATION_MS}ms`,
          transitionTimingFunction: ANIMATION_EASING,
        }}
      >
        {state.previousText}
      </span>
      <span
        className="col-start-1 row-start-1 leading-none will-change-transform motion-reduce:transition-none"
        style={{
          transform: nextTransform,
          transitionDuration: `${SWAP_ANIMATION_MS}ms`,
          transitionTimingFunction: ANIMATION_EASING,
        }}
      >
        {state.nextText}
      </span>
    </span>
  );
}

export function AnimatedProfitValue({
  value,
  fallback = "N/A",
  prefix = "",
  suffix = "",
  className,
  ...props
}: AnimatedProfitValueProps) {
  const text = getText(value, fallback);
  const accessibleText = `${prefix}${text}${suffix}`;
  const [state, setState] = useState<AnimationState>({
    kind: "plain",
    text,
  });
  const animationIdRef = useRef(0);
  const previousTextRef = useRef(text);
  const previousValueRef = useRef<number | null | undefined>(value);
  const hasMountedRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const clearPendingAnimation = () => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => clearPendingAnimation, []);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      previousTextRef.current = text;
      previousValueRef.current = value;
      return;
    }

    const previousText = previousTextRef.current;
    const previousValue = previousValueRef.current;

    if (previousText === text) {
      previousValueRef.current = value;
      return;
    }

    previousTextRef.current = text;
    previousValueRef.current = value;
    clearPendingAnimation();

    if (prefersReducedMotion()) {
      setState({ kind: "plain", text });
      return;
    }

    const direction = getDirection(previousValue, value);
    const animationId = animationIdRef.current + 1;
    animationIdRef.current = animationId;

    if (supportsDigitRoll(previousText, text)) {
      const segments = buildSegments(previousText, text, direction);
      const maxDurationMs = segments.reduce(
        (maxDuration, segment) =>
          segment.kind === "digit"
            ? Math.max(maxDuration, segment.durationMs)
            : maxDuration,
        0,
      );

      setState({
        kind: "segments",
        id: animationId,
        text,
        segments,
        active: false,
      });

      rafRef.current = window.requestAnimationFrame(() => {
        setState((currentState) =>
          currentState.kind === "segments" && currentState.id === animationId
            ? { ...currentState, active: true }
            : currentState,
        );
      });

      timeoutRef.current = window.setTimeout(() => {
        setState((currentState) =>
          "id" in currentState && currentState.id === animationId
            ? { kind: "plain", text }
            : currentState,
        );
      }, maxDurationMs + 60);

      return;
    }

    setState({
      kind: "swap",
      id: animationId,
      text,
      previousText,
      nextText: text,
      direction,
      active: false,
    });

    rafRef.current = window.requestAnimationFrame(() => {
      setState((currentState) =>
        currentState.kind === "swap" && currentState.id === animationId
          ? { ...currentState, active: true }
          : currentState,
      );
    });

    timeoutRef.current = window.setTimeout(() => {
      setState((currentState) =>
        currentState.kind === "swap" && currentState.id === animationId
          ? { kind: "plain", text }
          : currentState,
      );
    }, SWAP_ANIMATION_MS + 60);
  }, [text, value]);

  return (
    <span
      className={cn("inline-flex items-center tabular-nums leading-none", className)}
      aria-label={accessibleText}
      {...props}
    >
      {state.kind === "plain" ? (
        <span aria-hidden="true" className="whitespace-nowrap">
          {accessibleText}
        </span>
      ) : (
        <span aria-hidden="true" className="inline-flex items-center">
          {prefix ? <span className="whitespace-nowrap">{prefix}</span> : null}
          {renderVisualState(state)}
          {suffix ? <span className="whitespace-nowrap">{suffix}</span> : null}
        </span>
      )}
    </span>
  );
}

export default AnimatedProfitValue;
