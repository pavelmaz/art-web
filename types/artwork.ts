export type Artwork = {
  id: string;
  slug: string;
  title: string;
  artistName: string;
  artistDisplay?: string;
  dateDisplay?: string | null;
  imageUrl: string;
  imageId?: string | null;
  museum?: string | null;
  styleTitle?: string | null;
  genreTitle?: string | null;
  score?: number | null;
  url?: string | null;
  styleSlug: string;
  styleName: string;
  description?: string;
  sourceUrl?: string;
};
