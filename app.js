// WORDS: [day, 영어, 한글 뜻] 목록 (words.js)
const $ = (id) => document.getElementById(id);
const DAYS = [...new Set(WORDS.map((w) => w[0]))].sort((a, b) => a - b);
const dayLabel = (d) => GROUPS[d - 1][1]; // 파트 이름 (words.js)
const catOf = (d) => GROUPS[d - 1][0];      // 0: 동반의어, 1: 기본 단어

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function show(id) {
  ['home', 'quiz', 'result', 'sheet'].forEach((s) => $(s).classList.toggle('hidden', s !== id));
  window.scrollTo(0, 0);
}

/* ---------- 시작 화면: 파트 고르기 ---------- */
// 종류(동반의어 / 기본 단어)마다 칸을 따로 만들고,
// 파트 이름 "2-3 기출예제1번" → 묶음 "2-3", 파트 "기출예제1번"
const PARTS = DAYS.map((d) => {
  const name = dayLabel(d);
  const i = name.indexOf(' ');
  return {
    id: d,
    cat: catOf(d),
    group: i > 0 ? name.slice(0, i) : name,
    part: i > 0 ? name.slice(i + 1) : name,
  };
});
const groupsOf = (c) => [...new Set(PARTS.filter((p) => p.cat === c).map((p) => p.group))];
const partsOf = (c, g) => PARTS.filter((p) => p.cat === c && (g === undefined || p.group === g));

function fillDays() {
  $('catTabs').innerHTML = CATS.map((name, c) => `
    <button type="button" class="cat-tab cat-${c}" data-tab="${c}">
      ${name} <span class="tab-count" id="tabCount${c}"></span>
    </button>`).join('');
  $('partList').innerHTML = CATS.map((name, c) => `
    <section class="cat-box cat-${c}" data-box="${c}">
      <div class="cat-head">
        <span class="cat-name">${name}</span>
        <span class="cat-count" id="catCount${c}"></span>
        <button type="button" class="cat-all" data-cat="${c}">전체</button>
      </div>
      <div class="cat-body">
        ${groupsOf(c).map((g) => `
          <div class="part-group">
            <div class="pg-head">
              <span class="pg-name">${g}</span>
              <button type="button" class="pg-all" data-cat="${c}" data-group="${g}">전체</button>
            </div>
            <div class="pg-parts">
              ${partsOf(c, g).map((p) => `
                <label class="part"><input type="checkbox" value="${p.id}"><span>${p.part}</span></label>`).join('')}
            </div>
          </div>`).join('')}
      </div>
    </section>`).join('');
}

// 탭은 보이는 칸만 바꾸고, 다른 탭에서 고른 파트는 그대로 남는다
function showTab(c) {
  document.querySelectorAll('.cat-tab').forEach((t) => t.classList.toggle('active', +t.dataset.tab === c));
  document.querySelectorAll('.cat-box').forEach((b) => b.classList.toggle('hidden', +b.dataset.box !== c));
}
$('catTabs').addEventListener('click', (e) => {
  const t = e.target.closest('.cat-tab');
  if (t) showTab(+t.dataset.tab);
});

const boxes = () => [...document.querySelectorAll('#partList input')];
const boxesOf = (ids) => boxes().filter((b) => ids.includes(+b.value));
function selected() {
  return boxes().filter((b) => b.checked).map((b) => +b.value);
}
function setSelected(ids) {
  boxes().forEach((b) => (b.checked = ids.includes(+b.value)));
}
// 고른 파트들에서 골고루 뽑기:
// 파트마다 단어를 섞어 두고, 파트를 돌아가며 한 개씩 꺼낸다.
// 단어가 적은 파트가 먼저 바닥나면 남은 파트에서 계속 돌아가며 꺼낸다.
function balancedSample(n) {
  const ids = shuffle(selected());
  const queues = ids.map((id) => shuffle(WORDS.filter((w) => w[0] === id)));
  const out = [];
  while (out.length < n && queues.some((q) => q.length)) {
    for (const q of queues) {
      if (q.length && out.length < n) out.push(q.pop());
    }
  }
  return shuffle(out);
}

function pool() {
  const ids = new Set(selected());
  return WORDS.filter((w) => ids.has(w[0]));
}
// 시험지 머리글에 쓸 범위 글자: "동반의어 2-3 전체 / 미니3회 1번 + 기본 단어 전체"
function rangeText() {
  const ids = new Set(selected());
  const perCat = CATS.map((name, c) => {
    const all = partsOf(c);
    const on = all.filter((p) => ids.has(p.id));
    if (!on.length) return null;
    if (on.length === all.length) return { full: `${name} 전체`, short: `${name} 전체` };
    const groups = groupsOf(c).map((g) => {
      const gp = partsOf(c, g), gon = gp.filter((p) => ids.has(p.id));
      if (!gon.length) return '';
      return gon.length === gp.length ? `${g} 전체` : `${g} ${gon.map((p) => p.part).join(', ')}`;
    }).filter(Boolean);
    return { full: `${name} ${groups.join(' / ')}`, short: `${name} ${on.length}개 파트` };
  }).filter(Boolean);
  if (perCat.length === CATS.length && perCat.every((x) => x.full.endsWith(' 전체') && x.full === x.short)) return '전체';
  const text = perCat.map((x) => x.full).join(' + ');
  return text.length > 55 ? perCat.map((x) => x.short).join(' + ') : text;
}

function updateCount() {
  const n = pool().length;
  $('poolCount').textContent = n;
  $('startTest').disabled = $('makeSheet').disabled = n === 0;
  syncGroupButtons();
  $('count').max = n;
  const c = +$('count').value;
  $('countWarn').textContent = n === 0 ? '위에서 파트를 하나 이상 골라 주세요.'
    : c > n ? `선택한 단어가 ${n}개라서 ${n}개만 출제돼요.` : '';
}

function wantedCount() {
  const n = pool().length;
  const c = Math.floor(+$('count').value) || 0;
  return Math.max(1, Math.min(c, n));
}

function syncGroupButtons() {
  document.querySelectorAll('.pg-all').forEach((btn) => {
    const bs = boxesOf(partsOf(+btn.dataset.cat, btn.dataset.group).map((p) => p.id));
    btn.classList.toggle('on', bs.every((b) => b.checked));
  });
  CATS.forEach((_, c) => {
    const bs = boxesOf(partsOf(c).map((p) => p.id));
    const n = bs.filter((b) => b.checked).length;
    $('catCount' + c).textContent = n ? `${n}개 파트 선택` : '';
    $('tabCount' + c).textContent = n || '';
    document.querySelector(`.cat-all[data-cat="${c}"]`).classList.toggle('on', n === bs.length);
  });
}
function toggleAll(bs) {
  const turnOn = !bs.every((b) => b.checked);
  bs.forEach((b) => (b.checked = turnOn));
  updateCount();
}
$('partList').addEventListener('change', updateCount);
$('partList').addEventListener('click', (e) => {
  const g = e.target.closest('.pg-all');
  if (g) return toggleAll(boxesOf(partsOf(+g.dataset.cat, g.dataset.group).map((p) => p.id)));
  const c = e.target.closest('.cat-all');
  if (c) return toggleAll(boxesOf(partsOf(+c.dataset.cat).map((p) => p.id)));
});
$('selNone').addEventListener('click', () => { setSelected([]); updateCount(); });
$('count').addEventListener('input', updateCount);
document.querySelectorAll('.chip[data-n]').forEach((b) =>
  b.addEventListener('click', () => { $('count').value = b.dataset.n; updateCount(); })
);
document.querySelectorAll('.step-btn').forEach((b) =>
  b.addEventListener('click', () => {
    const n = pool().length;
    const c = (Math.floor(+$('count').value) || 0) + +b.dataset.d;
    $('count').value = Math.max(1, Math.min(c, n));
    updateCount();
  })
);
$('allBtn').addEventListener('click', () => { $('count').value = pool().length; updateCount(); });

/* ---------- 카드 테스트 ---------- */
// 단어를 보고 뜻을 떠올린 뒤, 정답을 확인하고 스스로 맞음 / 헷갈림 / 틀림을 고른다
let quiz = null;

function startQuiz(words) {
  quiz = { words, i: 0, marks: [], revealed: false };
  show('quiz');
  renderCard();
}

function renderCard() {
  const total = quiz.words.length;
  const w = quiz.words[quiz.i];
  quiz.revealed = false;
  $('progressText').textContent = `${quiz.i + 1} / ${total}`;
  $('progressBar').style.width = (quiz.i / total) * 100 + '%';
  $('qCat').textContent = CATS[catOf(w[0])];
  $('qCat').className = 'card-cat cat-' + catOf(w[0]);
  $('qWord').textContent = w[1];
  $('qMeaning').textContent = w[2];
  $('qMeaning').classList.add('hidden');
  $('tapHint').classList.remove('hidden');
  $('flashcard').classList.remove('revealed');
  $('revealBtn').classList.remove('hidden');
  $('markBtns').classList.add('hidden');
}

function reveal() {
  if (quiz.revealed) return;
  quiz.revealed = true;
  $('qMeaning').classList.remove('hidden');
  $('tapHint').classList.add('hidden');
  $('flashcard').classList.add('revealed');
  $('revealBtn').classList.add('hidden');
  $('markBtns').classList.remove('hidden');
}

function mark(kind) {
  if (!quiz.revealed) return;
  quiz.marks.push({ word: quiz.words[quiz.i], kind });
  quiz.i++;
  if (quiz.i >= quiz.words.length) showResult();
  else renderCard();
}

$('flashcard').addEventListener('click', reveal);
$('revealBtn').addEventListener('click', reveal);
document.querySelectorAll('.mark').forEach((b) =>
  b.addEventListener('click', () => mark(b.dataset.mark))
);

document.addEventListener('keydown', (e) => {
  if ($('quiz').classList.contains('hidden')) return;
  if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); reveal(); }
  else if (e.key === '1') mark('good');
  else if (e.key === '2') mark('save');
  else if (e.key === '3') mark('bad');
});

$('quitQuiz').addEventListener('click', () => {
  if (!quiz.marks.length) { show('home'); return; }
  if (confirm('테스트를 그만하고 지금까지 결과를 볼까요?')) showResult();
});

const TAG = { bad: '❌', save: '⭐' };

function showResult() {
  const total = quiz.marks.length;
  const n = (k) => quiz.marks.filter((m) => m.kind === k).length;
  const good = n('good'), save = n('save'), bad = n('bad');
  $('totalText').textContent = `총 ${total}문제`;
  $('cntGood').textContent = good;
  $('cntSave').textContent = save;
  $('cntBad').textContent = bad;
  $('perfectMsg').classList.toggle('hidden', save + bad > 0);

  // 틀린 단어 먼저, 그다음 헷갈린 단어
  const review = [...quiz.marks.filter((m) => m.kind === 'bad'), ...quiz.marks.filter((m) => m.kind === 'save')];
  quiz.review = review.map((m) => m.word);
  $('reviewWrap').classList.toggle('hidden', review.length === 0);
  $('retryReview').classList.toggle('hidden', review.length === 0);
  $('reviewCount').textContent = `${review.length}개`;
  $('reviewList').innerHTML = '';
  for (const m of review) {
    const tr = document.createElement('tr');
    [[TAG[m.kind], 'tag'], [m.word[1], 'en'], [m.word[2], 'ko']].forEach(([t, cls]) => {
      const td = document.createElement('td');
      td.className = cls;
      td.textContent = t;
      tr.append(td);
    });
    $('reviewList').append(tr);
  }
  show('result');
}

$('startTest').addEventListener('click', () => startQuiz(balancedSample(wantedCount())));
$('retryReview').addEventListener('click', () => startQuiz(shuffle(quiz.review)));
$('goHome').addEventListener('click', () => show('home'));

/* ---------- 시험지 만들기 ---------- */
const TEST_PER_PAGE = 50;   // 2단 x 25줄
const ANSWER_PER_PAGE = 60; // 2단 x 30줄

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function chunk(arr, n) {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function pageHead(kind, total) {
  const info = kind === 'test'
    ? `<span>이름 <span class="blank"></span></span><span>점수 <span class="blank"></span> / ${total}</span>`
    : '';
  return `
    <div class="page-head">
      <div class="title-row">
        <h3>Self-Check</h3>
        <span class="tag">${kind === 'test' ? '시험지' : '답안지'}</span>
      </div>
      <div class="info-row">
        <span>${total}문항</span>
        ${info}
      </div>
    </div>`;
}

function buildPages(words, kind) {
  const per = kind === 'test' ? TEST_PER_PAGE : ANSWER_PER_PAGE;
  const pages = chunk(words.map((w, i) => [i + 1, w]), per);
  return pages.map((items, p) => {
    const half = Math.ceil(per / 2);
    const cols = [items.slice(0, half), items.slice(half)];
    const colHtml = cols.map((c) => `<div class="col">${c.map(([n, w]) =>
      kind === 'test'
        ? `<div class="item"><span class="n">${n}.</span><span class="en">${esc(w[1])}</span></div>`
        : `<div class="ans-item"><span class="n">${n}.</span><span class="en">${esc(w[1])}</span><span class="ko">${esc(w[2])}</span></div>`
    ).join('')}</div>`).join('');
    return `<div class="page">
      ${pageHead(kind, words.length)}
      <div class="page-cols">${colHtml}</div>
      <div class="page-foot">${kind === 'test' ? '시험지' : '답안지'} ${p + 1} / ${pages.length}</div>
    </div>`;
  }).join('');
}

function makeSheet() {
  const words = balancedSample(wantedCount());
  $('pages').innerHTML = buildPages(words, 'test') + buildPages(words, 'answer');
  show('sheet');
}

$('makeSheet').addEventListener('click', makeSheet);
$('reshuffle').addEventListener('click', makeSheet);
$('sheetBack').addEventListener('click', () => show('home'));

/* ---------- 인쇄 / PDF 저장 ----------
   카카오톡, 네이버 앱 등 앱 안의 브라우저는 인쇄 기능이 없어서
   크롬이나 사파리 같은 일반 브라우저로 열어 준다. */
const UA = navigator.userAgent;
const IN_APP = {
  kakao: /KAKAOTALK/i.test(UA),
  line: /\bLine\//i.test(UA),
  other: /NAVER\(inapp|DaumApps|Instagram|FBAN|FBAV|everytimeApp|BAND\//i.test(UA),
};

// 지금 고른 범위와 개수를 주소에 담아서, 새 브라우저에서 바로 시험지가 열리게 한다
function sheetUrl() {
  const u = new URL(location.href);
  u.hash = '';
  u.search = `?sheet=1&parts=${selected().join(',')}&n=${wantedCount()}`;
  return u.toString();
}

$('printBtn').addEventListener('click', () => {
  if (IN_APP.kakao) {
    alert('카카오톡 안에서는 인쇄가 안 돼서 다른 브라우저로 열게요.\n열린 화면에서 다시 “인쇄 / PDF 저장”을 눌러 주세요.');
    location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(sheetUrl());
    return;
  }
  if (IN_APP.line) {
    location.href = sheetUrl() + '&openExternalBrowser=1';
    return;
  }
  if (IN_APP.other || typeof window.print !== 'function') {
    alert('이 앱 안에서는 인쇄가 안 돼요.\n화면 오른쪽 위(또는 아래)의 ⋮ / ··· 메뉴에서 “다른 브라우저로 열기”를 누른 뒤 다시 시도해 주세요.');
    return;
  }
  window.print();
});

fillDays();
showTab(0);
updateCount();

// 주소에 시험지 정보가 있으면 (다른 브라우저로 넘어온 경우) 바로 시험지를 연다
(function openSheetFromUrl() {
  const q = new URLSearchParams(location.search);
  if (!q.get('sheet')) return;
  const ids = (q.get('parts') || '').split(',').map(Number).filter((d) => DAYS.includes(d));
  const n = +q.get('n');
  if (!ids.length) return;
  setSelected(ids);
  if (n > 0) $('count').value = n;
  updateCount();
  makeSheet();
  history.replaceState(null, '', location.pathname);
})();
