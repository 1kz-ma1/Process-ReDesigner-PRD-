import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { ValidationBadgeSettings, ValidationCounts, ValidationLevel } from "../models/types";

interface ValidationFloatingBadgeProps {
  counts: ValidationCounts;
  onOpenPanel: (focusTo?: "error" | "warning" | "info") => void;
  settings?: ValidationBadgeSettings;
}

const DEFAULT_SETTINGS: ValidationBadgeSettings = {
  visibility: "auto",
  threshold: {
    minCount: 1,
  },
};

const LEVEL_RANK: Record<ValidationLevel, number> = {
  info: 1,
  warning: 2,
  error: 3,
};

const resolveLevel = (counts: ValidationCounts): ValidationLevel => {
  if (counts.error > 0) {
    return "error";
  }
  if (counts.warning > 0) {
    return "warning";
  }
  return "info";
};

const emitTelemetry = (eventName: string, payload: Record<string, unknown>) => {
  window.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
};

function ValidationFloatingBadge({ counts, onOpenPanel, settings = DEFAULT_SETTINGS }: ValidationFloatingBadgeProps) {
  const [motionClass, setMotionClass] = useState("");
  const prevTotalRef = useRef(typeof counts?.total === "number" ? counts.total : 0);
  const hasShownRef = useRef(false);
  const warnedInvalidRef = useRef(false);

  const safeCounts = useMemo<ValidationCounts | null>(() => {
    if (!counts || typeof counts.total !== "number") {
      if (!warnedInvalidRef.current) {
        warnedInvalidRef.current = true;
        console.warn("ValidationFloatingBadge: counts is undefined or invalid. Badge is hidden safely.");
      }
      return null;
    }
    return counts;
  }, [counts]);

  const mergedSettings = useMemo<ValidationBadgeSettings>(() => {
    return {
      visibility: settings.visibility ?? "auto",
      threshold: {
        minCount: settings.threshold?.minCount ?? 1,
        minLevel: settings.threshold?.minLevel,
      },
    };
  }, [settings]);

  const level = useMemo(() => {
    if (!safeCounts) {
      return "info" as const;
    }
    return resolveLevel(safeCounts);
  }, [safeCounts]);

  const shouldShow = useMemo(() => {
    if (mergedSettings.visibility === "hidden") {
      return false;
    }

    if (mergedSettings.visibility === "always") {
      return true;
    }

    if (!safeCounts || safeCounts.total <= 0) {
      return false;
    }

    const minCount = mergedSettings.threshold?.minCount ?? 1;
    if (safeCounts.total < minCount) {
      return false;
    }

    const minLevel = mergedSettings.threshold?.minLevel;
    if (!minLevel) {
      return true;
    }

    return LEVEL_RANK[level] >= LEVEL_RANK[minLevel];
  }, [level, mergedSettings, safeCounts]);

  const tooltip = useMemo(() => {
    if (!safeCounts) {
      return "検証結果：読み込み中";
    }
    return `検証結果：${safeCounts.total}件（エラー${safeCounts.error} / 警告${safeCounts.warning} / 情報${safeCounts.info}）`;
  }, [safeCounts]);

  const ariaLabel = useMemo(() => {
    return `${tooltip} - クリックで詳細を開く`;
  }, [tooltip]);

  const displayCount = !safeCounts ? "0" : safeCounts.total > 99 ? "99+" : String(safeCounts.total);

  useEffect(() => {
    if (shouldShow && !hasShownRef.current) {
      hasShownRef.current = true;
      emitTelemetry("ui.validationBadge.shown", {
        level,
        countTotal: safeCounts?.total ?? 0,
      });
    }
  }, [level, safeCounts, shouldShow]);

  useEffect(() => {
    if (!shouldShow) {
      prevTotalRef.current = safeCounts?.total ?? 0;
      return;
    }

    const previous = prevTotalRef.current;
    const delta = (safeCounts?.total ?? 0) - previous;
    prevTotalRef.current = safeCounts?.total ?? 0;

    if (delta === 0) {
      return;
    }

    setMotionClass(delta > 0 ? "is-pulse" : "is-fade");
    const timeout = window.setTimeout(() => setMotionClass(""), delta > 0 ? 180 : 140);
    return () => window.clearTimeout(timeout);
  }, [safeCounts, shouldShow]);

  if (!shouldShow || !safeCounts) {
    return null;
  }

  const focusTo =
    safeCounts.error > 0 ? "error" : safeCounts.warning > 0 ? "warning" : safeCounts.info > 0 ? "info" : undefined;

  const handleOpen = () => {
    emitTelemetry("ui.validationBadge.clicked", {
      level,
      counts: {
          error: safeCounts.error,
          warning: safeCounts.warning,
          info: safeCounts.info,
      },
    });
    emitTelemetry("ui.validationPanel.opened_via_badge", {
      focusTo,
    });
    onOpenPanel(focusTo);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleOpen();
      return;
    }
    if (event.key === "Escape") {
      event.currentTarget.blur();
    }
  };

  return (
    <button
      type="button"
      className={`validation-floating-badge level-${level} is-appear ${motionClass}`.trim()}
      onClick={handleOpen}
      onKeyDown={onKeyDown}
      title={tooltip}
      role="button"
      tabIndex={0}
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <span className="icon" aria-label="検証結果の通知">
        🔔
      </span>
      <span className="count">{displayCount}</span>
    </button>
  );
}

export default memo(ValidationFloatingBadge);
