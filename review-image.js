/* 카드 테스트 결과(틀린 단어 · 헷갈린 단어)를 이미지로 그린다. 결과 화면에서 꾹 눌러 저장.
   - 사이트마다 index.html 에서 SITE_TITLE, SITE_SUB (필요하면 SITE_TITLE_FONT) 를 정한다.
   - 그림은 canvas 에 직접 그려서 기기마다 똑같이 나오게 한다. */

const RI = {
  W: 1080,          // 이미지 가로 (px)
  PAD: 64,
  font: '"Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
  c: {
    bg: '#F3EEFB', card: '#ffffff', mid: '#E3D9F5', point: '#B39DDB',
    sub: '#7E57C2', accent: '#5E35B1', dark: '#2E1A5C', text: '#2b2833',
    muted: '#8a8496', line: '#ECE6F6',
    good: '#2e9e5b', goodBg: '#e8f6ee', bad: '#d64545', badBg: '#fbeaea',
  },
};

// 글자를 주어진 폭에 맞춰 줄바꿈 (원래 줄바꿈도 지킨다)
function riWrap(ctx, text, maxW) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const ch of para) {
      if (ctx.measureText(line + ch).width > maxW && line) {
        // 영어 단어 중간에서 끊기지 않게 마지막 띄어쓰기에서 자른다
        const sp = line.lastIndexOf(' ');
        if (sp > 0 && /[A-Za-z]/.test(ch)) {
          out.push(line.slice(0, sp));
          line = line.slice(sp + 1) + ch;
        } else {
          out.push(line);
          line = ch.trim() ? ch : '';
        }
      } else {
        line += ch;
      }
    }
    out.push(line);
  }
  return out;
}

function riRound(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

// rows: [{ kind: 'bad'|'save', en, ko, cat }], counts: { good, save, bad }
async function drawReviewImage(rows, counts) {
  try {
    await Promise.all([
      document.fonts.load(`800 40px ${RI.font}`),
      document.fonts.load(`700 40px ${RI.font}`),
      document.fonts.load(`400 40px ${RI.font}`),
      window.SITE_TITLE_FONT ? document.fonts.load(`700 40px ${window.SITE_TITLE_FONT}`) : null,
    ]);
  } catch (e) { /* 글꼴을 못 불러와도 기본 글꼴로 그린다 */ }

  const { W, PAD, c } = RI;
  const cardX = PAD, cardW = W - PAD * 2, inX = cardX + 40, inW = cardW - 80;
  const TAGW = 64, enW = 320, koX = inX + TAGW + enW + 24, koW = inX + inW - koX;
  const F = (w, s) => `${w} ${s}px ${RI.font}`;

  // 1) 높이 계산용으로 줄바꿈부터 한다
  const measure = document.createElement('canvas').getContext('2d');
  const laid = rows.map((r) => {
    measure.font = F(700, 34);
    const en = riWrap(measure, r.en, enW);
    measure.font = F(400, 30);
    const ko = riWrap(measure, r.ko, koW);
    const h = Math.max(en.length * 44 + (r.cat ? 34 : 0), ko.length * 42) + 44;
    return { ...r, enLines: en, koLines: ko, h };
  });
  const headH = 330;
  const listH = laid.reduce((s, r) => s + r.h, 0) + 76;
  const H = headH + listH + PAD;

  // 2) 그리기 (선명하게 2배 크기)
  const scale = 2;
  const cv = document.createElement('canvas');
  cv.width = W * scale; cv.height = H * scale;
  const ctx = cv.getContext('2d');
  ctx.scale(scale, scale);
  ctx.textBaseline = 'top';
  ctx.fillStyle = c.bg; ctx.fillRect(0, 0, W, H);

  // 머리글
  ctx.textAlign = 'center';
  ctx.fillStyle = c.dark;
  ctx.font = window.SITE_TITLE_FONT ? `700 54px ${window.SITE_TITLE_FONT}, ${RI.font}` : F(800, 52);
  ctx.fillText(window.SITE_TITLE || '단어 테스트', W / 2, 56);
  ctx.fillStyle = c.sub;
  ctx.font = window.SITE_TITLE_FONT ? `700 30px ${window.SITE_TITLE_FONT}, ${RI.font}` : F(700, 30);
  const d = new Date();
  const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  ctx.fillText(`${window.SITE_SUB || '카드 테스트'} · ${date}`, W / 2, 128);

  // 맞음 / 헷갈림 / 틀림
  const boxes = [
    ['⭕ 맞음', counts.good, c.good, c.goodBg],
    ['⭐ 헷갈림', counts.save, c.accent, c.mid],
    ['❌ 틀림', counts.bad, c.bad, c.badBg],
  ];
  const bw = (cardW - 32) / 3;
  boxes.forEach(([label, n, fg, bg], i) => {
    const x = cardX + i * (bw + 16);
    riRound(ctx, x, 190, bw, 108, 20, bg);
    ctx.fillStyle = fg;
    ctx.font = F(700, 26); ctx.fillText(label, x + bw / 2, 204);
    ctx.font = F(800, 46); ctx.fillText(String(n), x + bw / 2, 238);
  });

  // 목록 카드
  const top = headH;
  riRound(ctx, cardX, top, cardW, listH, 28, c.card);
  ctx.textAlign = 'left';
  ctx.fillStyle = c.dark; ctx.font = F(800, 34);
  ctx.fillText('다시 볼 단어', inX, top + 36);
  const titleW = ctx.measureText('다시 볼 단어').width;
  ctx.fillStyle = c.muted; ctx.font = F(400, 28);
  ctx.fillText(`${rows.length}개`, inX + titleW + 14, top + 42);

  let y = top + 100;
  laid.forEach((r, idx) => {
    const bad = r.kind === 'bad';
    // 표시: ❌ 틀림 / ⭐ 헷갈림 (결과 화면과 같은 이모지)
    ctx.textAlign = 'left';
    ctx.font = F(400, 34);
    ctx.fillText(bad ? '❌' : '⭐', inX, y + 2);
    // 영어 (+ 종류)
    let ey = y;
    if (r.cat) {
      ctx.fillStyle = c.sub; ctx.font = F(700, 22);
      ctx.fillText(r.cat, inX + TAGW, ey + 2);
      ey += 34;
    }
    ctx.fillStyle = c.dark; ctx.font = F(700, 34);
    r.enLines.forEach((t, i) => ctx.fillText(t, inX + TAGW, ey + i * 44));
    // 뜻
    ctx.fillStyle = c.text; ctx.font = F(400, 30);
    r.koLines.forEach((t, i) => ctx.fillText(t, koX, y + 4 + i * 42));
    y += r.h;
    if (idx < laid.length - 1) { ctx.fillStyle = c.line; ctx.fillRect(inX, y - 22, inW, 2); }
  });

  return cv;
}

