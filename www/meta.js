// Fotwa El Alam — progression: 50 levels, shop, save game, and the shareable futuwwa card.

// ---------------------------------------------------------------- opponents
// Character models available for opponents (Microsoft Rocketbox, MIT). The futuwwas are fictional.
const M = { wrestler: 'Sports_Male_01', tank: 'Sports_Male_04', sweater: 'Male_Adult_20', worker: 'Wood_Male_01', delivery: 'Delivery_Male_01',
  gardener: 'Gardener_Male_01', jacket: 'Male_Adult_02', vest: 'Male_Adult_05', red: 'Male_Adult_10', grey: 'Male_Adult_14', blue: 'Male_Adult_17' };

export const CHAPTERS = [
  { n: 1, name: 'الحارة', sub: 'درب السعادة وحواريه، من العصر لنص الليل' },
  { n: 2, name: 'السوق', sub: 'من سوق الخضار لخان الخليلي' },
  { n: 3, name: 'الشارع والموقف', sub: 'مواقف وكباري ومحطات' },
  { n: 4, name: 'السطوح والبحر', sub: 'سطوح العمارات وكورنيش إسكندرية' },
  { n: 5, name: 'كبار المعلمين', sub: 'من السيدة لباب زويلة: الطريق لتاج فتوة مصر' },
];
export const ARENAS = { hara: 'الحارة', souq: 'السوق', 'souq:fish': 'سوق السمك', 'souq:clothes': 'سوق القماش', khan: 'خان الخليلي', mawqaf: 'الموقف وتحت الكوبري', sath: 'السطوح', bahr: 'كورنيش إسكندرية', qadima: 'شارع المعز وباب زويلة' };
export const TIME_NAMES = { fajr: 'الفجر', sobh: 'الصبح', dohr: 'الضهر', asr: 'العصر', maghrib: 'المغربية', leil: 'بالليل' };
export const WEATHER_NAMES = { clear: 'جو صافي', cloudy: 'غيم', rain: 'مطر ورعد', fog: 'شبورة', dust: 'خماسين وتراب' };
export const WEAPON_NAMES = { nabboot: 'نبوت', khayzaran: 'خيزرانة', shoma: 'شومة', nabbootNahas: 'نبوت مطعّم', nabla: 'نبلة' };
// [place, name, nick, model, arena, time, weather, weapon, second opponent [name, nick, model, weapon]]
const L = [
  // chapter 1 — the alley
  ['ناصية درب السعادة', 'شوقي', 'الصبي الجديد', 'jacket', 'hara', 'asr', 'clear'],
  ['قدام الفرن', 'عتريس', 'الفرّان', 'worker', 'hara', 'fajr', 'fog'],
  ['بير السلم', 'زغلول', 'أبو كف', 'red', 'hara', 'leil', 'clear'],
  ['ورشة النجارة', 'حمدي', 'المنشار', 'gardener', 'hara', 'dohr', 'clear', 'nabboot'],
  ['محل البقالة', 'سيد', 'الميزان', 'grey', 'hara', 'sobh', 'cloudy'],
  ['جنينة الحارة', 'رمضان', 'الأعور', 'vest', 'hara', 'maghrib', 'clear', 'nabla'],
  ['فرح في الحارة', 'شحاتة', 'الطبال', 'blue', 'hara', 'leil', 'clear', null, ['حودة', 'الزمّار', 'delivery']],
  ['قهوة المعلم', 'دهشان', 'اللي خد القهوة غصب', 'wrestler', 'hara', 'leil', 'rain'],
  ['الحمام الشعبي', 'عبده', 'البخار', 'sweater', 'hara', 'fajr', 'fog', 'khayzaran'],
  ['آخر الحارة', 'المعلم عتمان', 'كبير الدرب', 'tank', 'hara', 'leil', 'clear', 'nabbootNahas'],
  // chapter 2 — the market
  ['سوق الخضار', 'فتحي', 'الشيال', 'worker', 'souq', 'sobh', 'clear'],
  ['محل الجزارة', 'عوض', 'الجزار', 'grey', 'souq', 'dohr', 'clear', 'shoma'],
  ['سوق السمك', 'بلبل', 'الصياد', 'delivery', 'souq:fish', 'fajr', 'clear', 'nabla'],
  ['العتبة', 'نصر', 'البياع', 'jacket', 'souq', 'asr', 'dust', null, ['منصور', 'أخوه', 'red', 'nabboot']],
  ['الموسكي', 'كرم', 'أبو شنب', 'red', 'khan', 'maghrib', 'clear', 'khayzaran'],
  ['وكالة البلح', 'مرزوق', 'القماش', 'vest', 'souq:clothes', 'dohr', 'dust', 'nabboot'],
  ['سوق الجمعة', 'حنفي', 'الخردة', 'gardener', 'souq', 'sobh', 'cloudy', 'nabla'],
  ['سوق الحمام', 'صابر', 'الغيّة', 'blue', 'souq', 'asr', 'clear', null, ['عزّت', 'ابن عمه', 'sweater', 'nabla']],
  ['خان الخليلي', 'ماهر', 'النحاس', 'sweater', 'khan', 'leil', 'clear', 'shoma'],
  ['قلب السوق', 'المعلم سرحان', 'سلطان السوق', 'wrestler', 'khan', 'leil', 'rain', 'nabbootNahas'],
  // chapter 3 — street, stand and bridge
  ['موقف الميكروباص', 'عربي', 'السواق', 'delivery', 'mawqaf', 'sobh', 'clear'],
  ['كوبري الملك الصالح', 'جمعة', 'الليل', 'grey', 'mawqaf', 'leil', 'clear', 'nabboot'],
  ['محطة القطر', 'سعيد', 'الكمسري', 'jacket', 'mawqaf', 'fajr', 'fog', null, ['زكريا', 'زميله', 'worker', 'khayzaran']],
  ['تحت الكوبري', 'ضاحي', 'التوكتوك', 'red', 'mawqaf', 'leil', 'rain', 'nabla'],
  ['ورشة الميكانيكا', 'سمير', 'الشكمان', 'worker', 'mawqaf', 'dohr', 'clear', 'shoma'],
  ['موقف عبود', 'بدوي', 'المكشّر', 'vest', 'mawqaf', 'asr', 'dust', 'khayzaran'],
  ['شارع شبرا', 'خليل', 'الجامد', 'blue', 'mawqaf', 'maghrib', 'clear', 'nabboot', ['خميس', 'صاحبه', 'grey', 'nabla']],
  ['الدائري بالليل', 'زكي', 'الكلبش', 'sweater', 'mawqaf', 'leil', 'clear', 'shoma'],
  ['ميدان رمسيس', 'عاشور', 'الزحمة', 'tank', 'mawqaf', 'dohr', 'dust', 'nabla'],
  ['آخر الخط', 'المعلم غريب', 'ملك المواقف', 'wrestler', 'mawqaf', 'leil', 'rain', 'nabbootNahas'],
  // chapter 4 — rooftops and the sea
  ['سطوح عمارة', 'بكري', 'الحمام', 'gardener', 'sath', 'asr', 'clear'],
  ['سطوح الغسيل', 'فرغلي', 'الدش', 'jacket', 'sath', 'sobh', 'cloudy', 'nabboot', ['ميزو', 'ابن خالته', 'delivery']],
  ['خزان المية', 'صبري', 'السباك', 'worker', 'sath', 'dohr', 'clear', 'shoma'],
  ['غية الحمام', 'حسان', 'الغوّاي', 'delivery', 'sath', 'maghrib', 'clear', 'nabla'],
  ['كورنيش إسكندرية', 'بحر', 'الموجة', 'red', 'bahr', 'sobh', 'clear', 'khayzaran'],
  ['الأنفوشي', 'قنديل', 'الشبكة', 'vest', 'bahr', 'asr', 'cloudy', 'nabboot', ['عطوة', 'الونش', 'grey', 'nabla']],
  ['الميناء الشرقي', 'جابر', 'المراكبي', 'grey', 'bahr', 'fajr', 'fog', 'shoma'],
  ['بحري', 'مرسي', 'الريس', 'blue', 'bahr', 'maghrib', 'clear', 'khayzaran'],
  ['قلعة قايتباي', 'سلامة', 'الحارس', 'tank', 'bahr', 'leil', 'rain', 'nabbootNahas'],
  ['آخر المرسى', 'المعلم بحري', 'سيد البحر', 'wrestler', 'bahr', 'maghrib', 'cloudy', 'shoma'],
  // chapter 5 — the great masters
  ['السيدة زينب', 'المعلم شعبان', 'أبو الليل', 'sweater', 'qadima', 'leil', 'clear', 'shoma'],
  ['الحسين', 'المعلم حنتيرة', 'الطاووس', 'vest', 'qadima', 'maghrib', 'clear', 'khayzaran', ['بُرعي', 'صبيّه', 'jacket', 'nabla']],
  ['باب الشعرية', 'المعلم عرابي', 'الأسد', 'red', 'souq', 'dohr', 'dust', 'nabbootNahas'],
  ['الدرب الأحمر', 'المعلم بيومي', 'الجبل', 'tank', 'hara', 'fajr', 'fog', 'shoma'],
  ['باب الخلق', 'المعلم سبع', 'السبع', 'worker', 'qadima', 'asr', 'clear', 'nabboot', ['سبع الصغير', 'ابنه', 'red', 'khayzaran']],
  ['الخليفة', 'المعلم عضمة', 'الحديد', 'grey', 'sath', 'leil', 'clear', 'shoma'],
  ['القلعة', 'المعلم ريحان', 'الريح', 'blue', 'qadima', 'sobh', 'cloudy', 'khayzaran'],
  ['الأزهر', 'المعلم صقر', 'الصقر', 'jacket', 'khan', 'leil', 'rain', 'shoma', ['شاهين', 'صبيّه', 'gardener', 'nabla']],
  ['المقطم', 'المعلم نمر', 'النمر', 'gardener', 'sath', 'maghrib', 'dust', 'nabbootNahas'],
  ['تاج فتوة مصر', 'المعلم الكبير', 'سلطان الفتوات', 'wrestler', 'qadima', 'leil', 'clear', 'shoma'],
];
const ITEM_SETS = [
  ['chair', 'nabboot', 'tray', 'qulla'], ['tray', 'qulla', 'qulla', 'chair'], ['nabboot', 'nabboot', 'chair', 'tray'], ['qulla', 'chair', 'chair', 'nabboot'], ['nabboot', 'tray', 'qulla', 'chair'],
];
const threatOf = (foes) => foes.reduce((a, f) => a + f.hp * f.dmg * (1 + f.aggr) * (f.weapon ? (f.weapon === 'nabla' ? 1.1 : 1.15) : 1), 0) * (foes.length > 1 ? 1.15 : 1);
// difficulty: a power index that rises every single level (a boss adds a step that the next chapter keeps), mapped to stats
export function powerOf(n) { return n + 2 * Math.floor(n / 10) + (n % 10 === 0 ? 0 : 0); }   // 1..60, strictly increasing
const P_MAX = powerOf(50);
function statsAt(p, boss) {
  const k = (p - 1) / (P_MAX - 1);
  // skill rises fast early (the first levels teach, by level 10 he defends and counters), damage and toughness keep climbing to the end
  const sk = Math.min(1, Math.pow(k, 0.75));
  return { hp: Math.round(85 + 95 * k), dmg: +(0.9 + 1.2 * k).toFixed(3), aggr: +(0.62 + 0.38 * sk).toFixed(3), block: +(0.22 + 0.63 * sk).toFixed(3), react: +(0.34 - 0.24 * sk).toFixed(3),
    acc: +(0.5 + 0.45 * sk).toFixed(3), combo: +(0.25 + 0.7 * sk).toFixed(3), dodge: +(0.1 + 0.5 * sk).toFixed(3), skill: +sk.toFixed(3), tough: +(1 - 0.35 * k).toFixed(3), boss };
}
export const LEVELS = L.map(([place, name, nick, model, arena, time, weather, weapon, mate], i) => {
  const n = i + 1, ch = Math.floor(i / 10), boss = n % 10 === 0, p = powerOf(n), base = statsAt(p, boss);
  const foes = [Object.assign({ model: M[model], name, nick, weapon: weapon || null, rage: n >= 6 }, base)];
  if (mate) {   // two at once: each a little weaker than a lone opponent of this level, together clearly harder
    const lead = statsAt(p - 2.5, false), side = statsAt(p - 5, false);
    foes[0] = Object.assign(foes[0], lead, { hp: Math.round(lead.hp * 0.78), rage: n >= 6 });
    foes.push(Object.assign({ model: M[mate[2]], name: mate[0], nick: mate[1], weapon: mate[3] || null, rage: false }, side, { hp: Math.round(side.hp * 0.62), dmg: +(side.dmg * 0.85).toFixed(3) }));
  }
  // every level is harder than the one before: the threat (health x damage x aggression, weapon and two-on-one factors)
  // is pinned to a curve that rises with the power index; weapons and partners change how a fight plays, health balances it
  const raw = threatOf(foes), want = threatOf([Object.assign({}, statsAt(p, boss), { weapon: null })]) * (1 + 0.004 * n);
  const kHp = want / raw; for (const f of foes) f.hp = Math.max(40, Math.round(f.hp * kHp));
  const threat = Math.round(threatOf(foes) * 100) / 100;
  return {
    n, chapter: ch + 1, place, name, nick, model: M[model], boss, arena, time, weather, foes, duo: foes.length > 1, power: p,
    hp: foes[0].hp, dmg: foes[0].dmg, aggr: foes[0].aggr, block: foes[0].block, react: foes[0].react, rage: n >= 6, threat: Math.round(threat),
    crowd: 8 + Math.min(6, Math.floor(n / 6)), items: ITEM_SETS[(i + ch) % ITEM_SETS.length],
    time_limit: 99, reward: 100 + n * 15 + (boss ? 150 : 0) + (foes.length > 1 ? 60 : 0),
  };
});
// strictly rising after rounding: nudge health up by a point until each level's threat beats the one before
for (let i = 1; i < LEVELS.length; i++) { const l = LEVELS[i], pv = LEVELS[i - 1]; let t = threatOf(l.foes); while (t <= pv.threat) { for (const f of l.foes) f.hp += 1; t = threatOf(l.foes); } l.threat = Math.round(t * 100) / 100; l.hp = l.foes[0].hp; }
LEVELS[0].threat = Math.round(threatOf(LEVELS[0].foes) * 100) / 100;
export const THREAT_MAX = LEVELS[49].threat;

// ---------------------------------------------------------------- shop
export const SHOP = {
  weapons: [
    { id: 'nabbootNahas', name: 'نبوت مطعّم بالنحاس', desc: 'ضربته أتقل من النبوت العادي وبيستحمل ٩ ضربات', price: 300 },
    { id: 'khayzaran', name: 'عصاية خيزران', desc: 'خفيفة وسريعة، ضربتها أخف بس بتستحمل كتير', price: 450 },
    { id: 'shoma', name: 'شومة', desc: 'تقيلة ومرعبة، بتوقّع بسهولة بس بتتكسر أسرع', price: 800 },
  ],
  boosts: [
    { id: 'shai', name: 'كوباية شاي بالنعناع', desc: 'تبدأ الخناقة بصحة ١٢٠ بدل ١٠٠', price: 60 },
    { id: 'bakhour', name: 'بخور الهيبة', desc: 'تبدأ والهيبة متملية لحد النص', price: 80 },
    { id: 'halawa', name: 'حلاوة طحينية', desc: 'ضرباتك أقوى ١٢٪ طول الخناقة', price: 100 },
    { id: 'sebha', name: 'مسبحة الصبر', desc: 'وضع الفتوة يكمّل ١٠ ثواني بدل ٧', price: 120 },
  ],
};

// ---------------------------------------------------------------- titles by progress
export function rankOf(s) {
  const lv = s.level - 1;
  if (lv >= 50) return 'سلطان الفتوات'; if (lv >= 40) return 'فتوة مصر'; if (lv >= 30) return 'فتوة الحي';
  if (lv >= 20) return 'كبير السوق'; if (lv >= 10) return 'فتوة الحارة'; if (lv >= 3) return 'جدع الحارة'; return 'صبي فتوة';
}

// ---------------------------------------------------------------- save game: private per-player db, browser storage fallback
const KEY = 'fetwa-save-v1';
export function newSave() {
  return { v: 1, name: '', coins: 150, level: 1, stars: {}, owned: [], equip: null, boosts: {}, active: {},
    stats: { fights: 0, wins: 0, losses: 0, kos: 0, hits: 0, bestCombo: 0, rage: 0, grabs: 0, throwHits: 0, perfect: 0 }, created: Date.now() };
}
export async function openStore() {
  let local = null; try { local = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  const store = { data: Object.assign(newSave(), local || {}), db: null, ref: null, where: 'local' };
  store.data.stats = Object.assign(newSave().stats, store.data.stats || {});
  store.save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(store.data)); } catch (e) {}
    if (store.ref) { clearTimeout(store._t); store._t = setTimeout(() => store.ref.set(store.data).catch(() => {}), 400); }
  };
  // light up the cloud save when the viewer is signed in (never blocks the game)
  (async () => {
    try {
      if (!window.claude || !window.claude.use) return;
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) return; const id = await user.id(); if (!id) return;
      const ref = db.doc('data/users/' + id + '/save');
      const snap = await Promise.race([ref.get(), new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 10000))]);
      const remote = snap.exists ? snap.data() : null;
      // keep whichever save has gone further
      if (remote && ((remote.level || 1) > store.data.level || ((remote.level || 1) === store.data.level && (remote.stats?.fights || 0) > store.data.stats.fights))) {
        Object.assign(store.data, remote); store.data.stats = Object.assign(newSave().stats, remote.stats || {});
        try { localStorage.setItem(KEY, JSON.stringify(store.data)); } catch (e) {}
        store.onRemote && store.onRemote();
      }
      store.ref = ref; store.where = 'cloud'; if (!remote || remote !== store.data) ref.set(store.data).catch(() => {});
    } catch (e) { /* stays local */ }
  })();
  return store;
}

// apply the result of a fight; returns what to show on the end screen
export function settle(save, lv, r) {
  const st = save.stats; st.fights++; st.hits += r.hits; st.bestCombo = Math.max(st.bestCombo, r.bestCombo); st.rage += r.rage; st.grabs += r.grabs; st.throwHits += r.throwHits; st.kos += r.kos;
  let coins = 0, stars = 0, unlocked = false;
  if (r.win) {
    st.wins++; stars = r.hpPct >= 70 ? 3 : r.hpPct >= 35 ? 2 : 1; if (r.hpPct >= 99) st.perfect++;
    const first = !save.stars[lv.n];
    coins = Math.round(lv.reward * (first ? 1 : 0.4)) + (r.ko ? 30 : 0) + (stars === 3 ? 50 : 0);
    save.stars[lv.n] = Math.max(save.stars[lv.n] || 0, stars);
    if (lv.n === save.level && save.level <= 50) { save.level = Math.min(51, save.level + 1); unlocked = true; }
  } else { st.losses++; coins = 20 + Math.min(40, r.hits * 2); }
  save.coins += coins;
  return { coins, stars, unlocked };
}

// ---------------------------------------------------------------- futuwwa card (PNG)
export async function drawCard(save, opts = {}) {
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  try { await Promise.race([document.fonts.load('700 80px "Aref Ruqaa"'), document.fonts.load('800 40px Cairo'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  const st = save.stats, cleared = Math.max(0, save.level - 1), starsSum = Object.values(save.stars).reduce((a, b) => a + b, 0);
  // background: night alley tones, brass frame
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1d140d'); g.addColorStop(0.55, '#120c08'); g.addColorStop(1, '#2a1a0c'); x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(242,217,138,${Math.random() * 0.05})`; x.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 30, 1 + Math.random() * 3); }
  x.strokeStyle = '#d9a441'; x.lineWidth = 10; x.strokeRect(34, 34, W - 68, H - 68); x.strokeStyle = 'rgba(242,217,138,0.45)'; x.lineWidth = 2; x.strokeRect(56, 56, W - 112, H - 112);
  // corner ornaments
  for (const [cx, cy] of [[56, 56], [W - 56, 56], [56, H - 56], [W - 56, H - 56]]) { x.fillStyle = '#d9a441'; x.beginPath(); x.arc(cx, cy, 16, 0, 7); x.fill(); x.fillStyle = '#120c08'; x.beginPath(); x.arc(cx, cy, 7, 0, 7); x.fill(); }
  x.direction = 'rtl'; x.textAlign = 'center';
  x.fillStyle = '#c9b99a'; x.font = '800 34px Cairo, sans-serif'; x.fillText('كارت فتوة', W / 2, 140);
  x.fillStyle = '#d9a441'; x.font = '700 120px "Aref Ruqaa", serif'; x.fillText('فتوة العالم', W / 2, 270);
  // name block
  x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(110, 320, W - 220, 190); x.strokeStyle = 'rgba(217,164,65,0.6)'; x.lineWidth = 3; x.strokeRect(110, 320, W - 220, 190);
  x.fillStyle = '#f2d98a'; x.font = '700 92px "Aref Ruqaa", serif'; fit(x, 'المعلم ' + (save.name || 'المجهول'), W / 2, 425, W - 280, 92, '"Aref Ruqaa", serif', 700);
  x.fillStyle = '#f2e6c9'; x.font = '800 40px Cairo, sans-serif'; x.fillText('لقبه: ' + rankOf(save), W / 2, 485);
  // stat tiles
  const ar = (n) => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const tiles = [['انتصارات', st.wins], ['ضربات قاضية', st.kos], ['مستويات خلصت', cleared + ' / ٥٠'], ['نجوم', starsSum], ['أكبر كومبو', st.bestCombo], ['مرات الفتوة', st.rage]];
  tiles.forEach(([lab, val], i) => { const col = i % 2, row = (i / 2) | 0, tx = col ? 120 : W / 2 + 15, ty = 560 + row * 175, tw = W / 2 - 135;
    x.fillStyle = 'rgba(242,217,138,0.07)'; x.fillRect(tx, ty, tw, 150); x.strokeStyle = 'rgba(217,164,65,0.4)'; x.lineWidth = 2; x.strokeRect(tx, ty, tw, 150);
    x.fillStyle = '#f2d98a'; x.font = '900 70px Cairo, sans-serif'; x.fillText(typeof val === 'number' ? ar(val) : ar(String(val)), tx + tw / 2, ty + 82); x.fillStyle = '#c9b99a'; x.font = '700 30px Cairo, sans-serif'; x.fillText(lab, tx + tw / 2, ty + 128); });
  // progress bar through the five chapters
  const by = 1110; x.fillStyle = 'rgba(242,230,201,0.12)'; x.fillRect(120, by, W - 240, 18); x.fillStyle = '#d9a441'; const pw = (W - 240) * Math.min(1, cleared / 50); x.fillRect(W - 120 - pw, by, pw, 18);
  x.fillStyle = '#c9b99a'; x.font = '700 28px Cairo, sans-serif'; x.fillText(cleared >= 50 ? 'سيطر على مصر كلها' : 'الفصل ' + ar(Math.min(5, Math.floor(cleared / 10) + 1)) + ': ' + (CHAPTERS[Math.min(4, Math.floor(cleared / 10))].name), W / 2, by + 62);
  x.fillStyle = '#f2e6c9'; x.font = '800 36px Cairo, sans-serif'; x.fillText(opts.cta || 'مين يقدر يقف قدامي؟ العب فتوة العالم', W / 2, 1245);
  return new Promise(r => c.toBlob(b => r({ blob: b, url: c.toDataURL('image/png') }), 'image/png'));
}
function fit(x, text, cx, cy, maxW, size, family, weight) { let s = size; x.font = `${weight} ${s}px ${family}`; while (x.measureText(text).width > maxW && s > 30) { s -= 4; x.font = `${weight} ${s}px ${family}`; } x.fillText(text, cx, cy); }

// share: native share sheet with the image when the browser allows it, else save it through the platform, else a plain download link
export async function shareCard(blob, name) {
  const file = new File([blob], 'futuwwa-card.png', { type: 'image/png' });
  const text = 'أنا المعلم ' + name + ' في لعبة فتوة العالم. تقدر تكسرني؟';
  // Android app: save the image to the app cache and open the system share sheet (WhatsApp, Facebook, ...)
  const CP = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() ? window.Capacitor.Plugins : null;
  if (CP && CP.Filesystem && CP.Share) {
    try {
      const b64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = rej; r.readAsDataURL(blob); });
      const w = await CP.Filesystem.writeFile({ path: 'futuwwa-card.png', data: b64, directory: 'CACHE' });
      await CP.Share.share({ title: 'كارت الفتوة', text: text + ' حمّل اللعبة من جوجل بلاي.', files: [w.uri], dialogTitle: 'شارك كارت الفتوة' });
      return 'shared';
    } catch (e) { if (e && /cancel/i.test(String(e.message || e))) return 'cancelled'; }
  }
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text, title: 'كارت الفتوة' }); return 'shared'; } } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
  try { const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; if (dl) { await dl.save({ filename: 'futuwwa-card.png', data: blob }); return 'saved'; } } catch (e) { if (e && e.code === 'declined') return 'cancelled'; }
  try { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'futuwwa-card.png'; document.body.appendChild(a); a.click(); a.remove(); return 'downloaded'; } catch (e) { return 'failed'; }
}
