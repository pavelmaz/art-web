export type BlogPostStatus = "draft" | "published";

export type BlogSection = {
  heading: string;
  html: string;
  artwork_id: string | null;
};

export type BlogArtwork = {
  id: string;
  slug: string;
  title: string;
  artist_display: string;
  date_display: string | null;
  image_id: string | null;
  url: string | null;
  alt_text: string | null;
};

export type BlogSectionResolved = BlogSection & {
  artwork: BlogArtwork | null;
};

export type BlogPostRow = {
  id: string;
  slug: string;
  locale: string;
  title: string;
  meta_title: string | null;
  meta_description: string | null;
  intro_html: string | null;
  conclusion_html: string | null;
  sections: BlogSection[];
  status: BlogPostStatus;
  published_at: string | null;
};

export type BlogPost = Omit<BlogPostRow, "sections" | "intro_html" | "conclusion_html"> & {
  intro_html: string;
  conclusion_html: string;
  sections: BlogSectionResolved[];
};

export type BlogPostListItem = {
  slug: string;
  title: string;
  meta_description: string;
  published_at: string;
  card_image_url: string | null;
};
