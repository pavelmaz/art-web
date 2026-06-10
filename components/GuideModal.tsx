"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import type {
  GuideInterest,
  TimeHours,
  VisitorExperience,
  VisitType,
} from "@/lib/guide-types";
import { getGuideTranslations } from "@/lib/guide-translations";

type GuideModalProps = {
  open: boolean;
  onClose: () => void;
  museumSlug: string;
  museumName: string;
  locale?: string;
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

type RadioCardProps = {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
};

function RadioCard({ selected, onSelect, title, description }: RadioCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        selected
          ? "flex w-full gap-3 rounded-lg border-[1.5px] border-neutral-900 bg-neutral-50 px-4 py-4 text-left transition-colors"
          : "flex w-full gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-4 text-left transition-colors hover:border-neutral-400"
      }
    >
      <span
        className={
          selected
            ? "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-neutral-900 bg-neutral-900"
            : "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 border-neutral-300 bg-white"
        }
        aria-hidden
      >
        {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-900">{title}</p>
        <p className="mt-1 text-xs text-neutral-500">{description}</p>
      </div>
    </button>
  );
}

function resolveVisitType(
  visitorExperience: VisitorExperience,
  focus?: string,
): VisitType {
  if (visitorExperience === "first_visit") return "masterpieces";
  if (focus?.trim()) return "in_depth";
  return "overview";
}

export function GuideModal({
  open,
  onClose,
  museumSlug,
  museumName,
  locale = "en",
}: GuideModalProps) {
  const router = useRouter();
  const t = getGuideTranslations(locale);

  const [step, setStep] = useState(1);
  const [visitorExperience, setVisitorExperience] = useState<VisitorExperience | null>(null);
  const [interest, setInterest] = useState<GuideInterest | null>(null);
  const [timeHours, setTimeHours] = useState<TimeHours | null>(null);
  const [focusText, setFocusText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusError, setFocusError] = useState<FocusNotFoundError | null>(null);
  const [progressIndex, setProgressIndex] = useState(0);

  const isReturning = visitorExperience === "returning";
  const totalSteps = isReturning ? 4 : 3;
  const isFinalStep = step === totalSteps;
  const progressMessages = t.modal.generating;

  useEffect(() => {
    if (!open) {
      setStep(1);
      setVisitorExperience(null);
      setInterest(null);
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
    if (step === 1 && visitorExperience) {
      setStep(2);
      return;
    }
    if (step === 2 && interest) {
      setStep(3);
      return;
    }
    if (step === 3 && isReturning) {
      setStep(4);
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
    if (!visitorExperience || !interest || timeHours === null) return;

    const focus = options?.withoutFocus ? undefined : focusText.trim() || undefined;
    const visitType = resolveVisitType(visitorExperience, focus);

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
          interest,
          returning_visitor: visitorExperience === "returning",
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
    setStep(4);
  };

  const handleGenerateWithoutFocus = () => {
    setFocusText("");
    void handleGenerate({ withoutFocus: true });
  };

  const canAdvance =
    (step === 1 && visitorExperience !== null) ||
    (step === 2 && interest !== null) ||
    (step === 3 && timeHours !== null);

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
          className="absolute right-4 top-4 rounded-md p-1 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 disabled:opacity-50"
          aria-label={t.modal.closeAriaLabel}
        >
          <X className="size-5" />
        </button>

        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-neutral-500">
          {t.modal.stepLabel(step, totalSteps)}
        </p>

        {generating ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
            <p className="text-sm font-medium text-neutral-900">{progressMessages[progressIndex]}</p>
          </div>
        ) : focusError ? (
          <div className="space-y-4 pt-2">
            <h2 id="guide-modal-title" className="text-xl font-semibold text-neutral-900">
              {t.modal.focusNotFoundTitle}
            </h2>
            <p className="text-sm leading-relaxed text-neutral-600">{focusError.message}</p>
            {focusError.suggestions.length > 0 ? (
              <div>
                <p className="text-sm font-medium text-neutral-900">{t.modal.focusArtistsLabel}</p>
                <ul className="mt-2 space-y-1 text-sm text-neutral-600">
                  {focusError.suggestions.map((artist) => (
                    <li key={artist}>{artist}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="flex flex-col gap-2 pt-2 sm:flex-row">
              <button
                type="button"
                onClick={handleTryDifferentFocus}
                className="rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-900 transition-colors hover:border-neutral-400"
              >
                {t.modal.tryDifferent}
              </button>
              <button
                type="button"
                onClick={() => void handleGenerateWithoutFocus()}
                className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black"
              >
                {t.modal.generateWithout}
              </button>
            </div>
          </div>
        ) : (
          <>
            {step === 1 ? (
              <div className="space-y-4 pt-2">
                <h2 id="guide-modal-title" className="text-xl font-semibold text-neutral-900">
                  {t.modal.visitBeforeHeading}
                </h2>
                <div className="space-y-3">
                  <RadioCard
                    selected={visitorExperience === "first_visit"}
                    onSelect={() => setVisitorExperience("first_visit")}
                    title={t.modal.visitBeforeOptions.first_visit.label}
                    description={t.modal.visitBeforeOptions.first_visit.description}
                  />
                  <RadioCard
                    selected={visitorExperience === "returning"}
                    onSelect={() => setVisitorExperience("returning")}
                    title={t.modal.visitBeforeOptions.returning.label}
                    description={t.modal.visitBeforeOptions.returning.description}
                  />
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-4 pt-2">
                <h2 id="guide-modal-title" className="text-xl font-semibold text-neutral-900">
                  {t.modal.interestHeading}
                </h2>
                <div className="space-y-3">
                  <RadioCard
                    selected={interest === "stories"}
                    onSelect={() => setInterest("stories")}
                    title={t.modal.interestOptions.stories.label}
                    description={t.modal.interestOptions.stories.description}
                  />
                  <RadioCard
                    selected={interest === "artist"}
                    onSelect={() => setInterest("artist")}
                    title={t.modal.interestOptions.artist.label}
                    description={t.modal.interestOptions.artist.description}
                  />
                  <RadioCard
                    selected={interest === "visual"}
                    onSelect={() => setInterest("visual")}
                    title={t.modal.interestOptions.visual.label}
                    description={t.modal.interestOptions.visual.description}
                  />
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4 pt-2">
                <h2 id="guide-modal-title" className="text-xl font-semibold text-neutral-900">
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
                            ? "rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
                            : "rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition-colors hover:border-neutral-400"
                        }
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {step === 4 && isReturning ? (
              <div className="space-y-4 pt-2">
                <h2 id="guide-modal-title" className="text-xl font-semibold text-neutral-900">
                  {t.modal.focusHeading}
                </h2>
                <p className="text-sm text-neutral-500">{t.modal.focusSubtext}</p>
                <input
                  type="text"
                  value={focusText}
                  onChange={(e) => {
                    setFocusText(e.target.value);
                    setFocusError(null);
                  }}
                  placeholder={t.modal.focusPlaceholder}
                  className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
                <button
                  type="button"
                  onClick={() => setFocusText("")}
                  className="text-sm text-neutral-500 underline underline-offset-2 hover:no-underline"
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
                    className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-900"
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
                    disabled={timeHours === null || !interest || !visitorExperience}
                    className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t.modal.generate}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canAdvance}
                    className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
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
