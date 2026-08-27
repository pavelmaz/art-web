// Generate imports/sheet-music/vintage-sheet-music.json (50 items) for
// import-sheet-music.mjs. Distinct works carry real per-locale titles; extra
// pages of a first edition inherit the parent title + " (n)".
// Run: node scripts/build-sheet-set.mjs
import { mkdirSync, writeFileSync } from "node:fs";

// distinct works: [file, artist, medium, {en, sp?,pt?,fr?,ger?,it?,jp?,ko?,ru?,ch?}]
const D = [
  ['File:Schubert Ave Maria.jpg', 'Franz Schubert', 'Engraving',
    { en: 'Ave Maria' }],
  ['File:Donauwalzer Cranz 01.jpg', 'Johann Strauss II', 'Lithograph',
    { en: 'The Blue Danube', sp: 'El Danubio azul', pt: 'O Danúbio Azul', fr: 'Le Beau Danube bleu', ger: 'An der schönen blauen Donau', it: 'Sul bel Danubio blu', jp: '美しく青きドナウ', ko: '아름답고 푸른 도나우', ru: 'На прекрасном голубом Дунае', ch: '蓝色多瑙河' }],
  ["File:Pachelbel's Canon - Mus.MS 16481-8 Page 1.jpg", 'Johann Pachelbel', 'Manuscript',
    { en: 'Canon in D', sp: 'Canon en re mayor', pt: 'Cânone em ré maior', fr: 'Canon en ré majeur', ger: 'Kanon in D-Dur', it: 'Canone in re maggiore', jp: 'パッヘルベルのカノン', ko: '캐논 라장조', ru: 'Канон ре мажор', ch: 'D大调卡农' }],
  ['File:TakehisaYumeji-1916-Senowo-Carmen Habanera.png', 'Georges Bizet', 'Lithograph',
    { en: 'Habanera from Carmen', sp: 'Habanera de Carmen', pt: 'Habanera de Carmen', fr: 'Habanera de Carmen', ger: 'Habanera aus Carmen', it: 'Habanera dalla Carmen', jp: 'カルメンのハバネラ', ko: '카르멘의 하바네라', ru: 'Хабанера из «Кармен»', ch: '《卡门》哈巴涅拉' }],
  ['File:Chopin – Introduction et polonaise Op. 3 (First French Edition, Title Page).png', 'Frédéric Chopin', 'Lithograph',
    { en: 'Introduction and Polonaise Op. 3', sp: 'Introducción y polonesa, op. 3', pt: 'Introdução e polonaise, op. 3', fr: 'Introduction et polonaise, op. 3', ger: 'Introduktion und Polonaise op. 3', it: 'Introduzione e polacca, op. 3', jp: '序奏と華麗なるポロネーズ 作品3', ko: '서주와 폴로네즈 작품 3', ru: 'Интродукция и полонез, соч. 3', ch: '引子与华丽的波兰舞曲，作品3' }],
  ['File:Deux Arabesques de Debussy.jpg', 'Claude Debussy', 'Lithograph',
    { en: 'Two Arabesques', sp: 'Dos arabescos', pt: 'Duas arabescas', fr: 'Deux Arabesques', ger: 'Zwei Arabesken', it: 'Due arabeschi', jp: '2つのアラベスク', ko: '두 개의 아라베스크', ru: 'Две арабески', ch: '两首阿拉贝斯克' }],
  ['File:Hallelujah score 1741.jpg', 'George Frideric Handel', 'Engraving',
    { en: 'Messiah (Hallelujah Chorus)', sp: 'El Mesías (Aleluya)', pt: 'O Messias (Aleluia)', fr: 'Le Messie (Alléluia)', ger: 'Der Messias (Halleluja)', it: 'Il Messia (Alleluia)', jp: 'メサイア（ハレルヤ・コーラス）', ko: '메시아 (할렐루야)', ru: 'Мессия (Аллилуйя)', ch: '《弥赛亚》哈利路亚' }],
  ['File:Maple Leaf Rag 1st ed.jpg', 'Scott Joplin', 'Lithograph',
    { en: 'Maple Leaf Rag', jp: 'メイプル・リーフ・ラグ', ko: '메이플 리프 래그', ru: 'Кленовый лист рэг', ch: '枫叶拉格' }],
  ['File:Entertainer 1.jpg', 'Scott Joplin', 'Lithograph',
    { en: 'The Entertainer', jp: 'ジ・エンターテイナー', ko: '디 엔터테이너', ru: 'Артист эстрады', ch: '艺人拉格' }],
  ['File:Rachmaninoff, Preludes Op 32, First edition.png', 'Sergei Rachmaninoff', 'Lithograph',
    { en: 'Preludes Op. 32', sp: 'Preludios, op. 32', pt: 'Prelúdios, op. 32', fr: 'Préludes, op. 32', ger: 'Préludes op. 32', it: 'Preludi, op. 32', jp: '前奏曲集 作品32', ko: '전주곡 작품 32', ru: 'Прелюдии, соч. 32', ch: '前奏曲，作品32' }],
  ['File:Le Cygne. The Swan. Extrait du "Carnaval des animaux" de C. Saint-Saëns. Transcription pour chant et piano par J. Samm. Traduction anglaise, par J.-N. Scholefield. Voix moyennes - bpt6k393119n (1 of 8).jpg', 'Camille Saint-Saëns', 'Lithograph',
    { en: 'The Swan', sp: 'El cisne', pt: 'O cisne', fr: 'Le Cygne', ger: 'Der Schwan', it: 'Il cigno', jp: '白鳥', ko: '백조', ru: 'Лебедь', ch: '天鹅' }],
  ['File:Mendelsohn Wedding March 1.jpg', 'Felix Mendelssohn', 'Lithograph',
    { en: 'Wedding March', sp: 'Marcha nupcial', pt: 'Marcha nupcial', fr: 'Marche nuptiale', ger: 'Hochzeitsmarsch', it: 'Marcia nuziale', jp: '結婚行進曲', ko: '결혼 행진곡', ru: 'Свадебный марш', ch: '婚礼进行曲' }],
  ["File:Antonio Vivaldi, Cimento dell' Armonia e dell' Inventione, Op. 8, ribro primo.png", 'Antonio Vivaldi', 'Engraving',
    { en: 'The Four Seasons', sp: 'Las cuatro estaciones', pt: 'As quatro estações', fr: 'Les Quatre Saisons', ger: 'Die vier Jahreszeiten', it: 'Le quattro stagioni', jp: '四季', ko: '사계', ru: 'Времена года', ch: '四季' }],
  ['File:Ravel - Pavane pour une infante défunte (E. Demets editeur).png', 'Maurice Ravel', 'Lithograph',
    { en: 'Pavane pour une infante défunte', jp: '亡き王女のためのパヴァーヌ', ko: '죽은 왕녀를 위한 파반느', ru: 'Павана на смерть инфанты', ch: '为逝去公主而作的帕凡舞曲' }],
  ['File:The stars and stripes forever (NYPL Hades-464652-1165707).jpg', 'John Philip Sousa', 'Lithograph',
    { en: 'The Stars and Stripes Forever', jp: '星条旗よ永遠なれ', ko: '성조기여 영원하라', ru: 'Звёзды и полосы навсегда', ch: '星条旗永远飘扬' }],
  ['File:Toccata and Fugue in D minor, BWV 565 (Johannes Ringk manuscript).jpg', 'Johann Sebastian Bach', 'Manuscript',
    { en: 'Toccata and Fugue in D minor', sp: 'Tocata y fuga en re menor', pt: 'Tocata e fuga em ré menor', fr: 'Toccata et fugue en ré mineur', ger: 'Toccata und Fuge d-Moll', it: 'Toccata e fuga in re minore', jp: 'トッカータとフーガ ニ短調', ko: '토카타와 푸가 라단조', ru: 'Токката и фуга ре минор', ch: 'd小调托卡塔与赋格' }],
  ['File:Chopin valse 42 pacini.jpg', 'Frédéric Chopin', 'Lithograph',
    { en: 'Grande Valse, Op. 42', sp: 'Gran vals, op. 42', pt: 'Grande valsa, op. 42', fr: 'Grande Valse, op. 42', ger: 'Grande Valse op. 42', it: 'Gran valzer, op. 42', jp: '華麗なる大円舞曲 作品42', ko: '화려한 대왈츠 작품 42', ru: 'Большой вальс, соч. 42', ch: '华丽大圆舞曲，作品42' }],
  ['File:2ème gymnopédie - Erik Satie ; à Conrad Satie - btv1b52000072r (1 of 8).jpg', 'Erik Satie', 'Lithograph',
    { en: 'Gymnopédie No. 2', jp: 'ジムノペディ 第2番', ko: '짐노페디 2번', ru: 'Гимнопедия № 2', ch: '裸体歌舞 第2号' }],
  ['File:Erlkonig1sted.jpg', 'Franz Schubert', 'Lithograph',
    { en: 'Erlkönig', sp: 'El rey de los elfos', pt: 'O Rei dos Elfos', fr: 'Le Roi des aulnes', ger: 'Erlkönig', it: 'Il re degli elfi', jp: '魔王', ko: '마왕', ru: 'Лесной царь', ch: '魔王' }],
  ['File:Titelblatt Iberia2.jpg', 'Isaac Albéniz', 'Lithograph',
    { en: 'Iberia', jp: 'イベリア', ko: '이베리아', ru: 'Иберия', ch: '伊比利亚' }],
  ["File:Danse macabre - poëme symphonique - op. 40 - de Camille Saint-Saëns ; transcription pour violon et piano par l'auteur - bpt6k1170198d (02 of 24).jpg", 'Camille Saint-Saëns', 'Lithograph',
    { en: 'Danse Macabre', sp: 'Danza macabra', pt: 'Dança macabra', fr: 'Danse macabre', ger: 'Danse macabre', it: 'Danza macabra', jp: '死の舞踏', ko: '죽음의 무도', ru: 'Пляска смерти', ch: '骷髅之舞' }],
  ['File:Marche de Radetzky, op. 228, , arrangée pour le piano par Alkan (Maxime) - btv1b10073696j (1 of 9).jpg', 'Johann Strauss I', 'Lithograph',
    { en: 'Radetzky March', sp: 'Marcha Radetzky', pt: 'Marcha Radetzky', fr: 'Marche de Radetzky', ger: 'Radetzky-Marsch', it: 'Marcia di Radetzky', jp: 'ラデツキー行進曲', ko: '라데츠키 행진곡', ru: 'Марш Радецкого', ch: '拉德茨基进行曲' }],
  ['File:Ave Maria composé sur la Méditation de "Thaïs, J. Massenet - bpt6k319892n (1 of 8).jpg', 'Jules Massenet', 'Lithograph',
    { en: 'Méditation de Thaïs', sp: 'Meditación de Thaïs', pt: 'Meditação de Thaïs', fr: 'Méditation de Thaïs', ger: 'Meditation aus Thaïs', it: 'Meditazione da Thaïs', jp: 'タイスの瞑想曲', ko: '타이스의 명상곡', ru: 'Размышление из «Таис»', ch: '《泰伊思》冥想曲' }],
  ['File:SolaceJoplinCover.jpg', 'Scott Joplin', 'Lithograph',
    { en: 'Solace', jp: 'ソレース', ko: '솔레이스', ru: 'Утешение', ch: '慰藉' }],
  ["File:España - suite de valses d'après la célèbre rapsodie d' Emmanuel Chabrier - pour piano - par Emile Waldteufel - btv1b10860254b (1 of 6).jpg", 'Émile Waldteufel', 'Lithograph',
    { en: 'España, Waltz', sp: 'España, vals', pt: 'España, valsa', fr: 'España, valse', ger: 'España, Walzer', it: 'España, valzer', jp: 'スペイン（ワルツ）', ko: '에스파냐 왈츠', ru: 'Испания, вальс', ch: '西班牙圆舞曲' }],
  ['File:Adieu à - Guil. Kolberg (en partant pour Reinerz) - Polonoise. 1826 - p. Chopin - btv1b55000831d (1 of 4).jpg', 'Frédéric Chopin', 'Manuscript',
    { en: 'Polonaise in B-flat (1826)', sp: 'Polonesa en si bemol (1826)', pt: 'Polaca em si bemol (1826)', fr: 'Polonaise en si bémol (1826)', ger: 'Polonaise B-Dur (1826)', it: 'Polacca in si bemolle (1826)', jp: 'ポロネーズ 変ロ長調（1826）', ko: '폴로네즈 내림나장조 (1826)', ru: 'Полонез си-бемоль мажор (1826)', ch: '降B大调波兰舞曲（1826）' }],
  ['File:Chopin opus 26 title.png', 'Frédéric Chopin', 'Lithograph',
    { en: 'Polonaises Op. 26', sp: 'Polonesas, op. 26', pt: 'Polacas, op. 26', fr: 'Polonaises, op. 26', ger: 'Polonaisen op. 26', it: 'Polacche, op. 26', jp: '2つのポロネーズ 作品26', ko: '폴로네즈 작품 26', ru: 'Полонезы, соч. 26', ch: '波兰舞曲，作品26' }],
  ['File:Cover of Biblioteca Lirică de Lux (Luxury Lyrical Library) music sheets with O theure Margarethe (01).jpg', 'Charles Gounod', 'Lithograph',
    { en: 'Faust (Marguerite)', sp: 'Fausto (Margarita)', pt: 'Fausto (Margarida)', fr: 'Faust (Marguerite)', ger: 'Faust (Margarethe)', it: 'Faust (Margherita)', jp: 'ファウスト（マルガレーテ）', ko: '파우스트 (마르가레테)', ru: 'Фауст (Маргарита)', ch: '浮士德（玛格丽特）' }],
];

const LOC = ['sp', 'pt', 'fr', 'ger', 'it', 'jp', 'ko', 'ru', 'ch'];
const swan = (n) => `File:Le Cygne. The Swan. Extrait du "Carnaval des animaux" de C. Saint-Saëns. Transcription pour chant et piano par J. Samm. Traduction anglaise, par J.-N. Scholefield. Voix moyennes - bpt6k393119n (${n} of 8).jpg`;
const espana = (n) => `File:España - suite de valses d'après la célèbre rapsodie d' Emmanuel Chabrier - pour piano - par Emile Waldteufel - btv1b10860254b (${n} of 6).jpg`;
const polo = (n) => `File:Adieu à - Guil. Kolberg (en partant pour Reinerz) - Polonoise. 1826 - p. Chopin - btv1b55000831d (${n} of 4).jpg`;
const radetzky = (n) => `File:Marche de Radetzky, op. 228, , arrangée pour le piano par Alkan (Maxime) - btv1b10073696j (${n} of 9).jpg`;
const thais = (n) => `File:Ave Maria composé sur la Méditation de "Thaïs, J. Massenet - bpt6k319892n (${n} of 8).jpg`;
const toccata = { 2: 'pg2', 3: 'pg3', 4: 'pg4', 5: 'pg5', 6: 'pg6of6' };

// extras: [file, parentEnTitle, pageNumber]  — title = parent + " (n)"
const X = [
  [swan(2), 'The Swan', 2], [swan(3), 'The Swan', 3], [swan(4), 'The Swan', 4], [swan(5), 'The Swan', 5], [swan(6), 'The Swan', 6],
  [`File:Toccata and Fugue in D minor, BWV 565 (Johannes Ringk manuscript, ${toccata[2]}).jpg`, 'Toccata and Fugue in D minor', 2],
  [`File:Toccata and Fugue in D minor, BWV 565 (Johannes Ringk manuscript, ${toccata[3]}).jpg`, 'Toccata and Fugue in D minor', 3],
  [`File:Toccata and Fugue in D minor, BWV 565 (Johannes Ringk manuscript, ${toccata[4]}).jpg`, 'Toccata and Fugue in D minor', 4],
  [`File:Toccata and Fugue in D minor, BWV 565 (Johannes Ringk manuscript, ${toccata[5]}).jpg`, 'Toccata and Fugue in D minor', 5],
  [`File:Toccata and Fugue in D minor, BWV 565 (Johannes Ringk manuscript, ${toccata[6]}).jpg`, 'Toccata and Fugue in D minor', 6],
  ['File:Entertainer 2.jpg', 'The Entertainer', 2], ['File:Entertainer 3.jpg', 'The Entertainer', 3], ['File:Entertainer 4.jpg', 'The Entertainer', 4],
  ['File:Maple Leaf Rag 1st ed 2.jpg', 'Maple Leaf Rag', 2], ['File:Maple Leaf Rag 1st ed 3.jpg', 'Maple Leaf Rag', 3], ['File:Maple Leaf Rag 1st ed 4.jpg', 'Maple Leaf Rag', 4],
  [polo(2), 'Polonaise in B-flat (1826)', 2], [polo(3), 'Polonaise in B-flat (1826)', 3],
  [espana(2), 'España, Waltz', 2], [espana(3), 'España, Waltz', 3],
  [radetzky(2), 'Radetzky March', 2],
  [thais(2), 'Méditation de Thaïs', 2],
];

const byEn = new Map(D.map(([f, a, m, t]) => [t.en, { artist: a, medium: m, t }]));
const items = [];
for (const [file, artist, medium, t] of D) {
  const title = { en: t.en };
  for (const l of LOC) if (t[l]) title[l] = t[l];
  items.push({ file, artist, medium, title });
}
for (const [file, parentEn, n] of X) {
  const p = byEn.get(parentEn);
  if (!p) throw new Error(`no parent for extra: ${parentEn}`);
  const title = { en: `${p.t.en} (${n})` };
  for (const l of LOC) if (p.t[l]) title[l] = `${p.t[l]} (${n})`;
  items.push({ file, artist: p.artist, medium: p.medium, title });
}

const set = {
  collection: 'Vintage Sheet Music',
  objectType: 'print',
  source: 'commons',
  medium_display: 'Lithograph',
  tags: ['sheet music', 'classical music', 'music'],
  items,
};
mkdirSync('imports/sheet-music', { recursive: true });
writeFileSync('imports/sheet-music/vintage-sheet-music.json', JSON.stringify(set, null, 1));
console.log(`wrote imports/sheet-music/vintage-sheet-music.json — ${items.length} items (${D.length} distinct + ${X.length} pages)`);
// quick uniqueness check on slugs
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100).replace(/-+$/, '');
const slugs = items.map((i) => slug(`${i.title.en}-sheet-music`));
const dup = slugs.filter((s, i) => slugs.indexOf(s) !== i);
console.log(dup.length ? `DUPLICATE SLUGS: ${[...new Set(dup)].join(', ')}` : 'all slugs unique ✓');
