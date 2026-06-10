export const VISIT_TYPES = ["masterpieces", "overview", "in_depth"] as const;
export type VisitType = (typeof VISIT_TYPES)[number];

export const TIME_HOURS_OPTIONS = [0.5, 1, 1.5, 2, 3, 4] as const;
export type TimeHours = (typeof TIME_HOURS_OPTIONS)[number];

export const GUIDE_INTERESTS = ["stories", "artist", "visual"] as const;
export type GuideInterest = (typeof GUIDE_INTERESTS)[number];

export const VISITOR_EXPERIENCES = ["first_visit", "returning"] as const;
export type VisitorExperience = (typeof VISITOR_EXPERIENCES)[number];

export const STOP_COUNT_BY_TIME: Record<TimeHours, number> = {
  0.5: 4,
  1: 8,
  1.5: 12,
  2: 16,
  3: 16,
  4: 16,
};

export type GuideArtworkCandidate = {
  id: string;
  title: string;
  artist_display: string;
  image_id: string;
  score: number;
  style_title: string | null;
};

export type GuideStop = {
  order: number;
  artwork_id: string;
  title: string;
  artist_display: string;
  image_id: string;
  score: number;
  reason: string;
  bullets: string[];
};

export type GuideData = {
  title: string;
  description: string;
  museum_name: string;
  museum_slug: string;
  visit_type: VisitType;
  time_hours: number;
  focus: string | null;
  generated_at: string;
  stops: GuideStop[];
};

export type GenerateGuideRequest = {
  museum_slug: string;
  museum_name: string;
  visit_type: VisitType;
  time_hours: TimeHours;
  focus?: string;
  locale: string;
  interest?: GuideInterest;
  returning_visitor?: boolean;
};
