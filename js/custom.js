/* ========================================
   未来体験パーク 独自スクリプト
   ======================================== */

/* ix3（GSAP）が動かないときの保険
   読み込み完了から2.5秒（遅くとも開いてから8秒）たっても
   html に w-mod-ix3 が付いていなければ、is-ix-fallback を付けて本文を表示する。
   表示の指定は css/custom.css にある。 */
(function () {
  var html = document.documentElement;
  var checked = false;

  function checkIx() {
    if (checked) return;
    checked = true;
    if (html.classList.contains('w-mod-js') && !html.classList.contains('w-mod-ix3')) {
      html.classList.add('is-ix-fallback');
      console.info('[mirai-park] ix fallback applied');
    }
  }

  function startTimer() {
    setTimeout(checkIx, 2500);
  }

  if (document.readyState === 'complete') {
    startTimer();
  } else {
    window.addEventListener('load', startTimer);
  }
  setTimeout(checkIx, 8000);
})();

/* TOP の HERO 背景動画（.hero-full_media[data-src] の video）
   - autoplay 属性は使わず、ここで設定を確かめてから再生する
   - 動きを減らす設定のときは自動再生しない（poster のまま。ボタンで再生できる）
   - 動画が無い・読み込めないときは poster のまま、ボタンを隠す
   - 画面の外に出たとき・タブが裏に回ったときは止め、戻ったら再開する（自分で止めたときは再開しない） */
(function () {
  var video = document.querySelector('video.hero-full_media[data-src]');
  if (!video) return;
  var button = video.parentElement.querySelector('.hero-full_toggle');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var userPaused = reduceMotion;
  var inView = true;
  var failed = false;

  function syncButton() {
    if (button) button.setAttribute('aria-pressed', video.paused ? 'true' : 'false');
  }

  function tryPlay() {
    if (failed || userPaused || !inView || document.hidden) return;
    var p = video.play();
    if (p && p.catch) p.catch(syncButton);
  }

  video.addEventListener('loadedmetadata', function () {
    if (failed) return;
    if (button) button.hidden = false;
    syncButton();
    tryPlay();
  });
  video.addEventListener('play', syncButton);
  video.addEventListener('pause', syncButton);
  video.addEventListener('error', function () {
    if (failed) return;
    failed = true;
    if (button) button.hidden = true;
    video.removeAttribute('src');
    video.load();
    console.info('[mirai-park] 動画がありません：' + video.getAttribute('data-src'));
  });

  if (button) {
    button.addEventListener('click', function () {
      if (video.paused) {
        userPaused = false;
        var p = video.play();
        if (p && p.catch) p.catch(syncButton);
      } else {
        userPaused = true;
        video.pause();
      }
    });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      inView = entries[0].isIntersecting;
      if (inView) tryPlay(); else video.pause();
    }).observe(video);
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) video.pause(); else tryPlay();
  });

  // 767px 以下は軽い 720p 版（data-src-mobile）を使う
  var mobileSrc = video.getAttribute('data-src-mobile');
  var useMobile = mobileSrc && window.matchMedia('(max-width: 767px)').matches;
  video.src = useMobile ? mobileSrc : video.getAttribute('data-src');
})();

/* グローバルナビの固定（10/24 オーナー承認の仕様。見た目は css/custom.css）
   - どのページも：ナビの高さを --nav-height に入れる（ページ内リンクの移動先がナビに隠れないように）
   - TOP（.hero-full.is-top があるページ）だけ：
     html に is-top-page を付け、PC 用のボタンをナビの直後に作る。
     HERO の下端がナビの下を過ぎたら .nav に is-shown を付ける。
     ボタンを押したときも is-shown（スクロールで HERO を過ぎた後、戻ると元に戻る）。Esc で閉じる。 */
(function () {
  var html = document.documentElement;
  var nav = document.querySelector('.nav');
  if (!nav) return;

  function setNavHeight() {
    var h = (nav.querySelector('.nav_container') || nav).offsetHeight;
    if (h) html.style.setProperty('--nav-height', h + 'px');
  }
  setNavHeight();
  window.addEventListener('resize', setNavHeight);

  var hero = document.querySelector('.hero-full.is-top');
  if (!hero) return;
  html.classList.add('is-top-page');
  setNavHeight();

  var button = document.createElement('button');
  button.type = 'button';
  button.className = 'nav_reveal-button';
  button.setAttribute('aria-label', 'メニューを表示');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square"><line x1="1" y1="5" x2="23" y2="5"></line><line x1="1" y1="12" x2="23" y2="12"></line><line x1="1" y1="19" x2="23" y2="19"></line></g></svg>';
  nav.parentNode.insertBefore(button, nav.nextSibling);

  var pastHero = false;
  var opened = false;

  function update() {
    var shown = pastHero || opened;
    nav.classList.toggle('is-shown', shown);
    button.setAttribute('aria-expanded', shown ? 'true' : 'false');
  }

  button.addEventListener('click', function () {
    opened = true;
    update();
    var first = nav.querySelector('.nav_logo');
    if (first) first.focus();
  });

  nav.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && opened && !pastHero) {
      opened = false;
      update();
      // ナビの中にフォーカスがあるとボタンが隠れたままなので、先に外してからボタンへ戻す
      if (document.activeElement) document.activeElement.blur();
      button.focus();
    }
  });

  if ('IntersectionObserver' in window) {
    var navH = (nav.querySelector('.nav_container') || nav).offsetHeight || 80;
    new IntersectionObserver(function (entries) {
      pastHero = !entries[0].isIntersecting;
      if (pastHero) opened = false;
      update();
    }, { rootMargin: '-' + navH + 'px 0px 0px 0px' }).observe(hero);
  } else {
    pastHero = true;
    update();
  }
})();

/* HERO のページ内リンクのチップ（.hero-full_link）
   webflow.js のページ内スクロールは、固定ナビが position: fixed のときしかナビの高さを引かない。
   下層ページのナビは sticky なので、見出しがナビの裏に隠れる。
   そこで、このリンクだけは自分で処理する（scroll-padding-top が効く scrollIntoView を使う）。
   要素自身で止めるので、document に登録された webflow.js の処理は動かない。 */
(function () {
  var links = document.querySelectorAll('a.hero-full_link[href^="#"]');
  if (!links.length) return;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  Array.prototype.forEach.call(links, function (link) {
    link.addEventListener('click', function (e) {
      var id = link.getAttribute('href').slice(1);
      var target = id && document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      e.stopPropagation();
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      if (history.pushState) history.pushState(null, '', '#' + id);
      // キーボード・読み上げの利用者のために、移動先へフォーカスも移す（画面は動かさない）
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });
})();

/* TOP：園内マップ。ピンを押すとリストの項目を強調し、リストの項目を押すとピンを強調する */
(function () {
  var map = document.querySelector('.park-map');
  if (!map) return;
  var pins = map.querySelectorAll('.park-map_pin');
  var items = map.querySelectorAll('.park-map_item');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function activate(id, fromPin) {
    pins.forEach(function (p) {
      var on = p.getAttribute('data-target') === id;
      p.classList.toggle('is-active', on);
      p.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    items.forEach(function (it) { it.classList.toggle('is-active', it.id === id); });
    var item = document.getElementById(id);
    if (!item || !fromPin) return;
    // リストの枠の中だけで動かす（ページ全体はスクロールさせない）
    var list = item.parentElement, panel = map.querySelector('.park-map_panel');
    var behavior = reduce ? 'auto' : 'smooth';
    if (getComputedStyle(list).overflowX === 'auto') {
      // スマホ・タブレット：リストは地図の下。横に送って、画面の下に見えるところまで寄せる
      item.scrollIntoView({ block: 'nearest', inline: 'start', behavior: behavior });
    } else {
      panel.scrollBy({ top: item.getBoundingClientRect().top - panel.getBoundingClientRect().top - 8, behavior: behavior });
    }
    item.focus({ preventScroll: true });
  }

  pins.forEach(function (p) {
    p.setAttribute('aria-pressed', 'false');
    p.addEventListener('click', function () { activate(p.getAttribute('data-target'), true); });
  });
  items.forEach(function (it) {
    it.addEventListener('click', function (ev) {
      if (ev.target.closest('a')) return;
      activate(it.id, false);
    });
  });
})();

/* スクロールで浮かび上がる動き（Webflow の ix3＝GSAP）を速くする（10/27 オーナー承認）
   - 1つの節がそろうまで約2秒かかり、もっさり感があったため、全体を 1.6 倍速にする（約1.1秒）
   - webflow.js は編集しない。GSAP 全体の再生速度だけを変える。数字を変えれば調整できる（1.3〜2.0 が目安）
   - 動きを減らす設定の人には、もともと動きが出ない（Webflow 側の設定） */
(function () {
  var SPEED = 1.6;
  function apply() {
    if (window.gsap && window.gsap.globalTimeline) {
      window.gsap.globalTimeline.timeScale(SPEED);
      return true;
    }
    return false;
  }
  if (!apply()) {
    document.addEventListener('DOMContentLoaded', apply);
    window.addEventListener('load', apply);
  }
})();

/* SHOWS：ショーの動画（.show-video）。10/28
   - 画面に近づいたら読み込み、半分以上見えたら再生、外れたら止める（通信量と電池の節約）
   - 5 秒より長く動くので、一時停止ボタンを付ける。自分で止めたら、画面に戻っても再開しない
   - 動きを減らす設定のときは自動再生しない（poster の写真のまま。ボタンで再生できる）
   - 読み込めないときは poster のまま、ボタンを隠す */
(function () {
  var boxes = document.querySelectorAll('.show-video');
  if (!boxes.length) return;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  boxes.forEach(function (box) {
    var video = box.querySelector('video[data-src]');
    var button = box.querySelector('.show-video_toggle');
    if (!video) return;
    var userPaused = reduceMotion;
    var visible = false;
    var loaded = false;
    var failed = false;

    function sync() { if (button) button.setAttribute('aria-pressed', video.paused ? 'true' : 'false'); }
    function load() {
      if (loaded) return;
      loaded = true;
      video.src = video.getAttribute('data-src');
    }
    function tryPlay() {
      if (failed || userPaused || !visible || document.hidden) return;
      load();
      var p = video.play();
      if (p && p.catch) p.catch(sync);
    }

    video.addEventListener('loadedmetadata', function () { if (!failed && button) { button.hidden = false; sync(); } });
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    video.addEventListener('error', function () {
      if (failed || !loaded) return;
      failed = true;
      if (button) button.hidden = true;
      console.info('[mirai-park] 動画がありません：' + video.getAttribute('data-src'));
    });
    if (button) {
      button.addEventListener('click', function () {
        if (video.paused) { userPaused = false; load(); var p = video.play(); if (p && p.catch) p.catch(sync); }
        else { userPaused = true; video.pause(); }
      });
    }
    if (reduceMotion && button) { load(); }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) load();
      }, { rootMargin: '300px 0px' }).observe(box);
      new IntersectionObserver(function (entries) {
        visible = entries[0].intersectionRatio >= 0.5;
        if (visible) tryPlay(); else video.pause();
      }, { threshold: [0, 0.5] }).observe(box);
    } else {
      visible = true; tryPlay();
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) video.pause(); else tryPlay();
    });
  });
})();
