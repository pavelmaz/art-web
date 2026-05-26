/** Map canonical English URL paths to localized paths (same slug where possible). */

export function enPathToJa(pathname: string): string {
  const p = pathname === "/" ? "" : pathname;
  if (p.startsWith("/artworks")) return `/ja${p}`;
  if (p.startsWith("/artists")) return `/ja${p}`;
  if (p.startsWith("/museums")) return `/ja${p}`;
  if (p.startsWith("/styles")) return `/ja${p}`;
  if (p.startsWith("/genres")) return `/ja${p}`;
  if (p.startsWith("/countries")) return `/ja${p}`;
  if (p.startsWith("/topics")) return `/ja${p}`;
  if (p.startsWith("/search")) return `/ja/search`;
  return p ? `/ja${p}` : "/ja";
}

export function enPathToEs(pathname: string): string {
  const p = pathname === "/" ? "" : pathname;
  if (p.startsWith("/artworks")) return `/es/obras${p.slice("/artworks".length)}`;
  if (p.startsWith("/artists")) return `/es/artistas${p.slice("/artists".length)}`;
  if (p.startsWith("/museums")) return `/es/museos${p.slice("/museums".length)}`;
  if (p.startsWith("/styles")) return `/es/estilos${p.slice("/styles".length)}`;
  if (p.startsWith("/genres")) return `/es/generos${p.slice("/genres".length)}`;
  if (p.startsWith("/countries")) return `/es/paises${p.slice("/countries".length)}`;
  if (p.startsWith("/topics")) return `/es/temas${p.slice("/topics".length)}`;
  if (p.startsWith("/search")) return "/es/buscar";
  return p ? `/es${p}` : "/es";
}

export function enPathToPt(pathname: string): string {
  const p = pathname === "/" ? "" : pathname;
  if (p.startsWith("/artworks")) return `/pt/obras${p.slice("/artworks".length)}`;
  if (p.startsWith("/artists")) return `/pt/artistas${p.slice("/artists".length)}`;
  if (p.startsWith("/museums")) return `/pt/museus${p.slice("/museums".length)}`;
  if (p.startsWith("/styles")) return `/pt/estilos${p.slice("/styles".length)}`;
  if (p.startsWith("/genres")) return `/pt/generos${p.slice("/genres".length)}`;
  if (p.startsWith("/countries")) return `/pt/paises${p.slice("/countries".length)}`;
  if (p.startsWith("/topics")) return `/pt/temas${p.slice("/topics".length)}`;
  if (p.startsWith("/search")) return "/pt/buscar";
  return p ? `/pt${p}` : "/pt";
}

export function esPathToEn(pathname: string): string {
  if (pathname === "/es" || pathname === "/es/") return "/";
  const rest = pathname.slice(3);
  if (rest.startsWith("/obras")) return `/artworks${rest.slice("/obras".length)}`;
  if (rest.startsWith("/artistas")) return `/artists${rest.slice("/artistas".length)}`;
  if (rest.startsWith("/museos")) return `/museums${rest.slice("/museos".length)}`;
  if (rest.startsWith("/estilos")) return `/styles${rest.slice("/estilos".length)}`;
  if (rest.startsWith("/generos")) return `/genres${rest.slice("/generos".length)}`;
  if (rest.startsWith("/paises")) return `/countries${rest.slice("/paises".length)}`;
  if (rest.startsWith("/temas")) return `/topics${rest.slice("/temas".length)}`;
  if (rest.startsWith("/buscar")) return "/search";
  return rest || "/";
}

export function ptPathToEn(pathname: string): string {
  if (pathname === "/pt" || pathname === "/pt/") return "/";
  const rest = pathname.slice(3);
  if (rest.startsWith("/obras")) return `/artworks${rest.slice("/obras".length)}`;
  if (rest.startsWith("/artistas")) return `/artists${rest.slice("/artistas".length)}`;
  if (rest.startsWith("/museus")) return `/museums${rest.slice("/museus".length)}`;
  if (rest.startsWith("/estilos")) return `/styles${rest.slice("/estilos".length)}`;
  if (rest.startsWith("/generos")) return `/genres${rest.slice("/generos".length)}`;
  if (rest.startsWith("/paises")) return `/countries${rest.slice("/paises".length)}`;
  if (rest.startsWith("/temas")) return `/topics${rest.slice("/temas".length)}`;
  if (rest.startsWith("/buscar")) return "/search";
  return rest || "/";
}

export function jaPathToEn(pathname: string): string {
  if (pathname === "/ja" || pathname === "/ja/") return "/";
  const rest = pathname.slice(3);
  return rest || "/";
}

export function buildHreflangLinkHeader(pathname: string): string {
  const site = "https://fineartfree.com";
  let enPath = pathname;

  if (pathname.startsWith("/es")) {
    enPath = esPathToEn(pathname);
  } else if (pathname.startsWith("/pt")) {
    enPath = ptPathToEn(pathname);
  } else if (pathname.startsWith("/ja")) {
    enPath = jaPathToEn(pathname);
  }

  const enUrl = `${site}${enPath === "/" ? "" : enPath}`;
  const esUrl = `${site}${enPathToEs(enPath)}`;
  const ptUrl = `${site}${enPathToPt(enPath)}`;
  const jaUrl = `${site}${enPathToJa(enPath)}`;

  return (
    `<${enUrl}>; rel="alternate"; hreflang="en", ` +
    `<${esUrl}>; rel="alternate"; hreflang="es", ` +
    `<${ptUrl}>; rel="alternate"; hreflang="pt", ` +
    `<${jaUrl}>; rel="alternate"; hreflang="ja", ` +
    `<${enUrl}>; rel="alternate"; hreflang="x-default"`
  );
}
