// WORDS: [day, 영어, 한글 뜻] 목록 (words.js)
const $ = (id) => document.getElementById(id);
const DAYS = [...new Set(WORDS.map((w) => w[0]))].sort((a, b) => a - b);
const dayLabel = (d) => GROUPS[d - 1]; // 항목 이름 (words.js)

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

/* ---------- 시작 화면 ---------- */
function fillDays() {
  for (const sel of [$('dayFrom'), $('dayTo')]) {
    sel.innerHTML = DAYS.map((d) => `<option value="${d}">${dayLabel(d)}</option>`).join('');
  }
  $('dayFrom').value = DAYS[0];
  $('dayTo').value = DAYS[0];
}

function range() {
  let a = +$('dayFrom').value, b = +$('dayTo').value;
  if (a > b) [a, b] = [b, a];
  return [a, b];
}
function pool() {
  const [a, b] = range();
  return WORDS.filter((w) => w[0] >= a && w[0] <= b);
}
function rangeText() {
  const [a, b] = range();
  return a === b ? dayLabel(a) : `${dayLabel(a)} ~ ${dayLabel(b)}`;
}

function updateCount() {
  const n = pool().length;
  $('poolCount').textContent = n;
  $('count').max = n;
  const c = +$('count').value;
  $('countWarn').textContent = c > n ? `범위 안의 단어가 ${n}개라서 ${n}개만 출제돼요.` : '';
}

function wantedCount() {
  const n = pool().length;
  const c = Math.floor(+$('count').value) || 0;
  return Math.max(1, Math.min(c, n));
}

$('dayFrom').addEventListener('change', () => {
  if (+$('dayTo').value < +$('dayFrom').value) $('dayTo').value = $('dayFrom').value;
  updateCount();
});
$('dayTo').addEventListener('change', () => {
  if (+$('dayFrom').value > +$('dayTo').value) $('dayFrom').value = $('dayTo').value;
  updateCount();
});
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

$('startTest').addEventListener('click', () => startQuiz(shuffle(pool()).slice(0, wantedCount())));
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
        <h3>Self-Check <span class="range">${esc(rangeText())}</span></h3>
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
  const words = shuffle(pool()).slice(0, wantedCount());
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
  const [a, b] = range();
  const u = new URL(location.href);
  u.hash = '';
  u.search = `?sheet=1&from=${a}&to=${b}&n=${wantedCount()}`;
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
updateCount();

// 주소에 시험지 정보가 있으면 (다른 브라우저로 넘어온 경우) 바로 시험지를 연다
(function openSheetFromUrl() {
  const q = new URLSearchParams(location.search);
  if (!q.get('sheet')) return;
  const a = +q.get('from'), b = +q.get('to'), n = +q.get('n');
  if (DAYS.includes(a)) $('dayFrom').value = a;
  if (DAYS.includes(b)) $('dayTo').value = b;
  if (n > 0) $('count').value = n;
  updateCount();
  makeSheet();
  history.replaceState(null, '', location.pathname);
})();
