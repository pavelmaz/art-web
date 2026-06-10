"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import type { TimeHours, VisitType } from "@/lib/guide-types";
import { getGuideTranslations } from "@/lib/guide-translations";

type GuideModalProps = {
  open: boolean;
  onClose: () => void;
  museumSlug: string;
  museumName: string;
  locale?: string;
};

const VISIT_TYPE_ORDER: VisitType[] = ["masterpieces", "overview", "in_depth"];
const VISIT_EMOJI: Record<VisitType, string> = {
  masterpieces: "⭐",
  overview: "🗺",
  in_depth: "🔍",
};

const TIME_OPTIONS: Array<{ label: string; value: TimeHours }> = [
  { label: "30 min", value: 0.5 },
  { label: "1h", value: 1 },
  { label: "1.5h", value: 1.5 },
  { label: "2h", value: 2 },
  { label: "3h", value: 3 },
  { label: "4h", value: 4 },
];

type FocusNotFoundError = {
  message: string;
  suggestions: string[];
};

type GenerateResponse = {
  token?: string;
  error?: string;
  message?: string;
  suggestions?: string[];
};

export function GuideModal({
  open,
  onClose,
  museumSlug,
  museumName,
  locale = "en",
}: GuideModalProps) {
  const router = useRouter();
  const t = getGuideTranslations(locale);
  const visitOptions = useMemo(
    () =>
      VISIT_TYPE_ORDER.map((value) => ({
        value,
        emoji: VISIT_EMOJI[value],
        title: t.modal.visitTypes[value].label,
        subtitle: t.modal.visitTypes[value].description,
      })),
    [t],
  );

  const [step, setStep] = useState(1);
  const [visitType, setVisitType] = useState<VisitType | null>(null);
  const [timeHours, setTimeHours] = useState<TimeHours | null>(null);
  const [focusText, setFocusText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusError, setFocusError] = useState<FocusNotFoundError | null>(null);
  const [progressIndex, setProgressIndex] = useState(0);

  const totalSteps = visitType === "in_depth" ? 3 : 2;
  const isFinalStep = step === totalSteps;
  const progressMessages = t.modal.generating;

  useEffect(() => {
    if (!open) {
      setStep(1);
      setVisitType(null);
      setTimeHours(null);
      setFocusText("");
      setGenerating(false);
      setError(null);
      setFocusError(null);
      setProgressIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!generating) return;
    const timer = window.setInterval(() => {
      setProgressIndex((i) => (i + 1) % progressMessages.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [generating, progressMessages.length]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !generating) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, generating, onClose]);

  const handleNext = () => {
    if (step === 1 && visitType) {
      setStep(2);
      return;
    }
    if (step === 2 && visitType === "in_depth") {
      setStep(3);
    }
  };

  const handleBack = () => {
    setError(null);
    setFocusError(null);
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleGenerate = async (options?: { withoutFocus?: boolean }) => {
    if (!visitType || timeHours === null) return;

    const focus = options?.withoutFocus ? undefined : focusText.trim() || undefined;

    setGenerating(true);
    setError(null);
    setFocusError(null);
    setProgressIndex(0);

    try {
      const response = await fetch("/api/guides/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          museum_slug: museumSlug,
          museum_name: museumName,
          visit_type: visitType,
          time_hours: timeHours,
          focus,
          locale,
        }),
      });

      const errorData = (await response.json().catch(() => null)) as GenerateResponse | null;

      if (response.status === 422 && errorData?.error === "focus_not_found") {
        setFocusError({
          message: errorData.message ?? t.modal.errorRetry,
          suggestions: errorData.suggestions ?? [],
        });
        setGenerating(false);
        return;
      }

      if (!response.ok) {
        const msg = errorData?.message || errorData?.error || t.modal.errorRetry;
        setError(msg);
        setGenerating(false);
        return;
      }

      if (!errorData?.token) {
        setError(t.modal.errorRetry);
        setGenerating(false);
        return;
      }

      onClose();
      router.push(`/guides/${museumSlug}/${errorData.token}`);
    } catch {
      setError(t.modal.errorRetry);
      setGenerating(false);
    }
  };

  const handleTryDifferentFocus = () => {
    setFocusError(null);
    setFocusText("");
    setStep(3);
  };

  const handleGenerateWithoutFocus = () => {
    setFocusText("");
    void handleGenerate({ withoutFocus: true });
  };

  const canAdvanceStep1 = visitType !== null;
  const canAdvanceStep2 = timeHours !== null;

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={() => {
        if (!generating) onClose();
      }}
      role="presentation"
    >
      <div
        className="relative flex max-h-[100dvh] w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:max-h-[90vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-modal-title"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={generating}
          className="absolute right-4 top-4 rounded-md p-1 text-[#6b6b6b] transition-colors hover:bg-neutral-100 hover:text-[#1a1a1a] disabled:opacity-50"
          aria-label={t.modal.closeAriaLabel}
        >
          <X className="size-5" />
        </button>

        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#6b6b6b]">
          {t.modal.stepLabel(step, totalSteps)}
        </p>

        {generating ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-2 border-[#1a1a1a] border-t-transparent" />
            <p className="text-sm font-medium text-[#1a1a1a]">{progressMessages[progressIndex]}</p>
          </div>
        ) : focusError ? (
          <div className="space-y-4 pt-2">
            <h2 id="guide-modal-title" className="text-xl font-semibold text-[#1a1a1a]">
              {t.modal.focusNotFoundTitle}
            </h2>
            <p className="text-sm leading-relaxed text-[#4a4a4a]">{focusError.message}</p>
            {focusError.suggestions.length > 0 ? (
              <div>
                <p className="text-sm font-medium text-[#1a1a1a]">{t.modal.focusArtistsLabel}</p>
                <ul className="mt-2 space-y-1 text-sm text-[#4a4a4a]">
                  {focusError.suggestions.map((artist) => (
                    <li key={artist}>• {artist}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={handleTryDifferentFocus}
                className="rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-[#1a1a1a] transition-colors hover:border-neutral-400"
              >
                {t.modal.tryDifferent}
              </button>
              <button
                type="button"
                onClick={() => void handleGenerateWithoutFocus()}
                className="rounded-lg bg-[#1a1a1a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black"
              >
                {t.modal.generateWithout}
              </button>
            </div>
          </div>
        ) : (
          <>
            {step === 1 ? (
              <div className="space-y-4 pt-2">
                <h2 id="guide-modal-title" className="text-xl font-semibold text-[#1a1a1a]">
                  {t.modal.visitTypeHeading}
                </h2>
                <div className="space-y-3">
                  {visitOptions.map((option) => {
                    const selected = visitType === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setVisitType(option.value)}
                        className={
                          selected
                            ? "w-full rounded-lg border-2 border-neutral-900 bg-neutral-50 px-4 py-4 text-left transition-colors"
                            : "w-full rounded-lg border border-neutral-200 bg-white px-4 py-4 text-left transition-colors hover:border-neutral-400"
                        }
                      >
                        <p className="font-medium text-[#1a1a1a]">
                          {option.emoji} {option.title}
                        </p>
                        <p className="mt-1 text-sm text-[#6b6b6b]">{option.subtitle}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4 pt-2">
                <h2 id="guide-modal-title" className="text-xl font-semibold text-[#1a1a1a]">
                  {t.modal.durationHeading}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {TIME_OPTIONS.map((option) => {
                    const selected = timeHours === option.value;
                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => setTimeHours(option.value)}
                        className={
                          selected
                            ? "rounded-full bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white"
                            : "rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-[#1a1a1a] transition-colors hover:border-neutral-400"
                        }
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {step === 3 && visitType === "in_depth" ? (
              <div className="space-y-4 pt-2">
                <h2 id="guide-modal-title" className="text-xl font-semibold text-[#1a1a1a]">
                  {t.modal.focusHeading}
                </h2>
                <p className="text-sm text-[#6b6b6b]">{t.modal.focusSubtext}</p>
                <input
                  type="text"
                  value={focusText}
                  onChange={(e) => {
                    setFocusText(e.target.value);
                    setFocusError(null);
                  }}
                  placeholder={t.modal.focusPlaceholder}
                  className="w-full rounded-lg border border-[#dadada] px-4 py-3 text-sm text-[#1a1a1a] placeholder:text-[#9ca3af] focus:border-[#1a1a1a] focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]"
                />
                <button
                  type="button"
                  onClick={() => setFocusText("")}
                  className="text-sm text-[#6b6b6b] underline underline-offset-2 hover:no-underline"
                >
                  {t.modal.focusSkip}
                </button>
              </div>
            ) : null}

            {error ? (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => void handleGenerate()}
                  className="mt-2 font-medium underline underline-offset-2 hover:no-underline"
                >
                  {t.modal.tryAgain}
                </button>
              </div>
            ) : null}

            {!focusError ? (
              <div className="mt-8 flex items-center justify-between gap-3">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="text-sm font-medium text-[#6b6b6b] transition-colors hover:text-[#1a1a1a]"
                  >
                    {t.modal.back}
                  </button>
                ) : (
                  <span />
                )}

                {isFinalStep ? (
                  <button
                    type="button"
                    onClick={() => void handleGenerate()}
                    disabled={!canAdvanceStep2}
                    className="rounded-lg bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t.modal.generate}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={step === 1 ? !canAdvanceStep1 : !canAdvanceStep2}
                    className="rounded-lg bg-[#1a1a1a] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t.modal.next}
                  </button>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
