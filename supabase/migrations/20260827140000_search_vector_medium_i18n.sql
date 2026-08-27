-- Localized medium search: let non-English visitors find works by the translated
-- medium word ("aguafuerte", "eau-forte", "Radierung", "acquaforte" -> etching;
-- "óleo", "huile", "Öl" -> oil, etc.). Mirrors lib/artwork-i18n.ts MEDIUM_I18N.
--
-- A lookup table holds the space-joined translations per English medium; the
-- search_vector trigger appends them (UNACCENTED, to match the RPC which unaccents
-- the query term). Existing rows were backfilled once by recomputing search_vector
-- for rows whose lower(medium_display) matches a medium_i18n key.

create table if not exists public.medium_i18n (
  medium_en text primary key,
  translations text not null
);
truncate public.medium_i18n;
insert into public.medium_i18n (medium_en, translations) values
('oil on canvas','óleo sobre lienzo óleo sobre tela huile sur toile Öl auf Leinwand olio su tela キャンバスに油彩 캔버스에 유채 холст, масло 布面油画'),
('oil on panel','óleo sobre tabla óleo sobre painel huile sur panneau Öl auf Holz olio su tavola 板に油彩 패널에 유채 дерево, масло 木板油画'),
('oil on paper','óleo sobre papel óleo sobre papel huile sur papier Öl auf Papier olio su carta 紙に油彩 종이에 유채 бумага, масло 纸本油画'),
('etching','aguafuerte água-forte eau-forte Radierung acquaforte エッチング 에칭 офорт 蚀刻版画'),
('engraving','grabado gravura gravure Kupferstich incisione 彫版画 판화 гравюра 雕版画'),
('drypoint','punta seca ponta-seca pointe sèche Kaltnadel puntasecca ドライポイント 드라이포인트 сухая игла 干刻法'),
('watercolor on paper','acuarela sobre papel aquarela sobre papel aquarelle sur papier Aquarell auf Papier acquerello su carta 紙に水彩 종이에 수채 бумага, акварель 纸本水彩'),
('ink on paper','tinta sobre papel tinta sobre papel encre sur papier Tinte auf Papier inchiostro su carta 紙に墨 종이에 먹 бумага, тушь 纸本水墨'),
('ink on silk','tinta sobre seda tinta sobre seda encre sur soie Tinte auf Seide inchiostro su seta 絹に墨 비단에 먹 шёлк, тушь 绢本水墨'),
('pencil on paper','lápiz sobre papel lápis sobre papel crayon sur papier Bleistift auf Papier matita su carta 紙に鉛筆 종이에 연필 бумага, карандаш 纸本铅笔画'),
('tempera on panel','temple sobre tabla têmpera sobre painel détrempe sur panneau Tempera auf Holz tempera su tavola 板にテンペラ 패널에 템페라 дерево, темпера 木板蛋彩画'),
('woodblock print','grabado en madera xilogravura estampe sur bois Holzschnitt silografia 木版画 목판화 ксилография 木版画'),
('lithograph','litografía litografia lithographie Lithografie litografia リトグラフ 석판화 литография 石版画'),
('albumen print','copia a la albúmina impressão em albumina tirage albuminé Albumin-Abzug stampa all''albumina 鶏卵紙 알부민 인화 альбуминовый отпечаток 蛋白印相'),
('fresco','fresco afresco fresque Fresko affresco フレスコ 프레스코 фреска 湿壁画'),
('paper','papel papel papier Papier carta 紙 종이 бумага 纸'),
('wood','madera madeira bois Holz legno 木 나무 дерево 木'),
('gold','oro ouro or Gold oro 金 금 золото 金'),
('metal','metal metal métal Metall metallo 金属 금속 металл 金属'),
('silk','seda seda soie Seide seta 絹 비단 шёлк 丝绸'),
('ceramic','cerámica cerâmica céramique Keramik ceramica 陶磁器 도자기 керамика 陶瓷'),
('porcelain','porcelana porcelana porcelaine Porzellan porcellana 磁器 자기 фарфор 瓷器'),
('ivory','marfil marfim ivoire Elfenbein avorio 象牙 상아 слоновая кость 象牙'),
('bronze','bronce bronze bronze Bronze bronzo ブロンズ 청동 бронза 青铜'),
('linen','lino linho lin Leinen lino 亜麻布 리넨 лён 亚麻'),
('lace','encaje renda dentelle Spitze pizzo レース 레이스 кружево 蕾丝'),
('textile','textil têxtil textile Textil tessuto 織物 직물 текстиль 纺织品')
on conflict (medium_en) do update set translations = excluded.translations;

CREATE OR REPLACE FUNCTION public.update_search_vector()
RETURNS trigger LANGUAGE plpgsql AS $function$
begin
  new.search_vector :=
    setweight(to_tsvector('simple', coalesce(unaccent(new.title), '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(unaccent(new.artist_display), '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(new.museum, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(new.genre_title, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(new.style_title, '')), 'C') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.medium_display, ''))), 'C') ||
    setweight(to_tsvector('simple', unaccent(coalesce((select translations from public.medium_i18n where medium_en = lower(new.medium_display)), ''))), 'C') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(new.tags, ' '), '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(new.location, '')), 'D');
  return new;
end;
$function$;
