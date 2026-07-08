/* ============================================================
   SIGNATURE ELEMENT — plotter-bot
   A small robot moves at constant speed along a single-stroke
   vector path that spells "DAN SHAW", drawing a trail as it goes
   and lifting its "pen" between letters. Loops after a pause.
   Respects prefers-reduced-motion (renders the finished trail,
   static, with no animation).
   ============================================================ */

(function () {
  const LETTERS = {
    D: [{ draw: true, pts: [[10,0],[36,0],[55,12],[62,30],[62,70],[55,88],[36,100],[10,100],[10,0]] }],
    A: [
      { draw: true, pts: [[0,100],[35,0],[70,100]] },
      { draw: true, pts: [[15,60],[55,60]] }
    ],
    N: [{ draw: true, pts: [[0,100],[0,0],[70,100],[70,0]] }],
    S: [{ draw: true, pts: [[55,4],[15,4],[3,14],[3,34],[16,45],[55,55],[67,66],[67,86],[55,96],[15,96]] }],
    H: [
      { draw: true, pts: [[0,0],[0,100]] },
      { draw: true, pts: [[0,50],[70,50]] },
      { draw: true, pts: [[70,0],[70,100]] }
    ],
    W: [{ draw: true, pts: [[0,0],[18,100],[35,32],[52,100],[70,0]] }],
    ' ': []
  };
  const LETTER_WIDTHS = { D:70, A:70, N:70, S:70, H:70, W:70, ' ':45 };
  const WORD = 'DAN SHAW';
  const LETTER_GAP = 16;

  function buildProgram() {
    // Flatten letters into one ordered list of {x1,y1,x2,y2,draw} segments
    // in local unit space (y: 0 top .. 100 bottom). A pen-up (draw:false)
    // segment is auto-inserted at every stroke/letter boundary where the
    // pen isn't already at the next stroke's start point — this is what
    // makes the robot lift its pen between letters instead of drawing a
    // stray connecting line.
    const segments = [];
    let cursorX = 0;
    let prevPoint = null;

    for (const ch of WORD) {
      const strokes = LETTERS[ch] || LETTERS[' '];
      for (const stroke of strokes) {
        const pts = stroke.pts;
        if (pts.length < 2) continue;
        const startX = cursorX + pts[0][0], startY = pts[0][1];

        if (prevPoint && (prevPoint.x !== startX || prevPoint.y !== startY)) {
          segments.push({ x1: prevPoint.x, y1: prevPoint.y, x2: startX, y2: startY, draw: false });
        }

        for (let i = 0; i < pts.length - 1; i++) {
          const [x1, y1] = pts[i];
          const [x2, y2] = pts[i + 1];
          segments.push({ x1: cursorX + x1, y1, x2: cursorX + x2, y2, draw: stroke.draw });
        }
        const last = pts[pts.length - 1];
        prevPoint = { x: cursorX + last[0], y: last[1] };
      }
      cursorX += LETTER_WIDTHS[ch] + LETTER_GAP;
    }
    return { segments, totalWidth: cursorX - LETTER_GAP };
  }

  const PROGRAM = buildProgram();

  function initRobotTrail(canvas) {
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let scale = 1, offsetX = 0, offsetY = 0, cw = 0, ch = 0;

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      cw = rect.width; ch = rect.height;
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      canvas.style.width = cw + 'px';
      canvas.style.height = ch + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const marginX = Math.min(40, cw * 0.06);
      const availW = cw - marginX * 2;
      const unitHeight = 100;
      scale = Math.min(availW / PROGRAM.totalWidth, (ch * 0.62) / unitHeight);
      offsetX = (cw - PROGRAM.totalWidth * scale) / 2;
      offsetY = (ch - unitHeight * scale) / 2;
    }

    function toCanvas(x, y) {
      return [offsetX + x * scale, offsetY + y * scale];
    }

    // Precompute segment lengths (in canvas px, post-scale) for constant-speed travel
    function computeLengths() {
      let total = 0;
      const withLen = PROGRAM.segments.map(seg => {
        const [ax, ay] = toCanvas(seg.x1, seg.y1);
        const [bx, by] = toCanvas(seg.x2, seg.y2);
        const len = Math.hypot(bx - ax, by - ay);
        total += len;
        return { ...seg, ax, ay, bx, by, len };
      });
      return { withLen, total };
    }

    let lengths = computeLengths();
    const SPEED = 340; // px per second
    let progress = 0;
    let lastT = null;
    let phase = 'drawing'; // drawing -> holding -> fading -> drawing...
    let phaseStart = 0;
    const HOLD_MS = 1500;
    const FADE_MS = 550;
    let fadeAlpha = 1;

    function drawStatic() {
      // Render the finished path with no animation (reduced motion / fallback)
      ctx.clearRect(0, 0, cw, ch);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let started = false;
      for (const seg of lengths.withLen) {
        if (!seg.draw) { started = false; continue; }
        if (!started) { ctx.moveTo(seg.ax, seg.ay); started = true; }
        ctx.lineTo(seg.bx, seg.by);
      }
      ctx.stroke();
    }

    function drawRobotAt(x, y, angle, penDown) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.globalAlpha = penDown ? 1 : 0.45;
      // body
      ctx.fillStyle = '#ffffff';
      const w = 16, h = 11;
      roundRect(ctx, -w/2, -h/2, w, h, 3);
      ctx.fill();
      // antenna
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -h/2);
      ctx.lineTo(0, -h/2 - 6);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -h/2 - 8, 1.6, 0, Math.PI * 2);
      ctx.fillStyle = '#3ddc84';
      ctx.fill();
      // eye slit
      ctx.fillStyle = '#000000';
      ctx.fillRect(-w/2 + 3, -1.2, w - 6, 2.4);
      ctx.restore();
    }

    function roundRect(c, x, y, w, h, r) {
      c.beginPath();
      c.moveTo(x + r, y);
      c.arcTo(x + w, y, x + w, y + h, r);
      c.arcTo(x + w, y + h, x, y + h, r);
      c.arcTo(x, y + h, x, y, r);
      c.arcTo(x, y, x + w, y, r);
      c.closePath();
    }

    function findPointAt(dist) {
      let acc = 0;
      for (const seg of lengths.withLen) {
        if (acc + seg.len >= dist || seg === lengths.withLen[lengths.withLen.length - 1]) {
          const t = seg.len === 0 ? 0 : (dist - acc) / seg.len;
          const x = seg.ax + (seg.bx - seg.ax) * t;
          const y = seg.ay + (seg.by - seg.ay) * t;
          const angle = Math.atan2(seg.by - seg.ay, seg.bx - seg.ax);
          return { x, y, angle, draw: seg.draw, seg };
        }
        acc += seg.len;
      }
      const last = lengths.withLen[lengths.withLen.length - 1];
      return { x: last.bx, y: last.by, angle: 0, draw: last.draw, seg: last };
    }

    function frame(t) {
      if (lastT === null) lastT = t;
      const dt = (t - lastT) / 1000;
      lastT = t;

      if (phase === 'drawing') {
        progress += SPEED * dt;
        if (progress >= lengths.total) {
          progress = lengths.total;
          phase = 'holding';
          phaseStart = t;
        }
      } else if (phase === 'holding') {
        if (t - phaseStart > HOLD_MS) { phase = 'fading'; phaseStart = t; }
      } else if (phase === 'fading') {
        fadeAlpha = 1 - Math.min(1, (t - phaseStart) / FADE_MS);
        if (fadeAlpha <= 0) {
          fadeAlpha = 1; phase = 'drawing'; progress = 0;
        }
      }

      ctx.clearRect(0, 0, cw, ch);
      ctx.globalAlpha = phase === 'fading' ? fadeAlpha : 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      let acc = 0, started = false;
      ctx.beginPath();
      for (const seg of lengths.withLen) {
        const segStart = acc, segEnd = acc + seg.len;
        acc = segEnd;
        if (progress <= segStart) break;
        if (!seg.draw) { started = false; continue; }
        const endT = Math.min(1, (progress - segStart) / (seg.len || 1));
        const ex = seg.ax + (seg.bx - seg.ax) * endT;
        const ey = seg.ay + (seg.by - seg.ay) * endT;
        if (!started) { ctx.moveTo(seg.ax, seg.ay); started = true; }
        ctx.lineTo(ex, ey);
      }
      ctx.stroke();

      const p = findPointAt(Math.min(progress, lengths.total));
      ctx.globalAlpha = phase === 'fading' ? fadeAlpha : 1;
      drawRobotAt(p.x, p.y, p.angle, p.draw);
      ctx.globalAlpha = 1;

      requestAnimationFrame(frame);
    }

    resize();
    lengths = computeLengths();

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => { resize(); lengths = computeLengths(); if (reduced) drawStatic(); }, 150);
    });

    if (reduced) {
      drawStatic();
    } else {
      requestAnimationFrame(frame);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('robot-trail');
    if (canvas) initRobotTrail(canvas);
  });
})();
