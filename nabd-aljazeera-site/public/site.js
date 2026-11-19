/* واجهة الموقع العامة: الرئيسية، القسم، البحث، صفحة الخبر */
(function () {
  "use strict";
  var N = window.NABD, esc = N.esc, CFG = N.CFG;
  var $ = function (id) { return document.getElementById(id); };
  var params = new URLSearchParams(location.search);
  var LOGO = '<svg viewBox="0 0 64 64" aria-hidden="true"><polyline points="8,34 20,34 25,22 31,46 37,16 42,34 56,34" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var PER_PAGE = 12;

  function ph(p, extra) { return '<div class="ph"' + (extra || "") + ">" + LOGO + (p.image ? '<img src="' + esc(p.image) + '" alt="" loading="lazy">' : "") + "</div>"; }
  function link(p) { return "/article.html?id=" + p.id; }
  function chip(p) { return p.catName ? '<span class="chip">' + esc(p.catName) + "</span>" : ""; }
  document.addEventListener("error", function (e) { if (e.target.tagName === "IMG" && e.target.parentNode.classList.contains("ph")) e.target.remove(); }, true);

  /* ---------- shell ---------- */
  function shell(cats) {
    var cur = +params.get("cat") || 0, page = document.body.dataset.page;
    $("site-header").innerHTML =
      (N.DEMO ? '<div class="demo-note">محتوى تجريبي – سيظهر محتوى الصحيفة بعد ربط الموقع بقاعدة البيانات</div>' : "") +
      '<div class="topbar"><div class="wrap"><span id="today">ود مدني</span><span><button id="themeBtn" type="button">◐ الوضع الليلي</button></span></div></div>' +
      '<header class="masthead"><div class="wrap"><a class="logo" href="/"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="var(--brand)"/><polyline points="8,34 20,34 25,22 31,46 37,16 42,34 56,34" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
      '<div><div class="name">نبض <span>الجزيرة</span></div><div class="tag">صحيفة إخبارية شاملة – ولاية الجزيرة، السودان</div></div></a>' +
      '<form class="search" role="search" action="/"><input type="search" name="q" placeholder="ابحث في الأخبار…" aria-label="بحث" value="' + esc(params.get("q") || "") + '"><button type="submit">بحث</button></form></div></header>' +
      '<nav class="main" aria-label="الأقسام"><div class="wrap"><ul><li><a href="/" class="' + (page === "home" && !cur && !params.get("q") ? "active" : "") + '">الرئيسية</a></li>' +
      cats.map(function (c) { return '<li><a href="/?cat=' + c.id + '" class="' + (cur === c.id ? "active" : "") + '">' + esc(c.name) + "</a></li>"; }).join("") + "</ul></div></nav>" +
      '<div class="ticker" id="ticker" hidden><div class="wrap"><span class="label">عاجل</span><div class="track"><div class="items" id="tickerItems"></div></div></div></div>';

    var contact = [];
    if (CFG.CONTACT_WHATSAPP) contact.push('<li><a href="https://wa.me/' + esc(CFG.CONTACT_WHATSAPP) + '" target="_blank" rel="noopener">واتساب</a></li>');
    if (CFG.CONTACT_EMAIL) contact.push('<li><a href="mailto:' + esc(CFG.CONTACT_EMAIL) + '">البريد الإلكتروني</a></li>');
    if (CFG.FACEBOOK_URL) contact.push('<li><a href="' + esc(CFG.FACEBOOK_URL) + '" target="_blank" rel="noopener">فيسبوك</a></li>');
    $("site-footer").innerHTML =
      '<footer><div class="wrap"><div class="cols"><div><h4>نبض الجزيرة</h4><p>صحيفة إخبارية تهتم بشؤون ولاية الجزيرة وإنسانها: الأخبار، والتحقيقات، والزراعة، والخدمات، والرياضة، والثقافة.</p></div>' +
      '<div><h4>الأقسام</h4><ul>' + cats.slice(0, 5).map(function (c) { return '<li><a href="/?cat=' + c.id + '">' + esc(c.name) + "</a></li>"; }).join("") + "</ul></div>" +
      '<div><h4>الصحيفة</h4><ul><li><a href="/about.html">من نحن</a></li><li><a href="/privacy.html">سياسة الخصوصية</a></li><li><a href="/admin/">دخول المحررين</a></li></ul></div>' +
      "<div><h4>تواصل</h4><ul>" + (contact.join("") || '<li><a href="/about.html">راسلنا بخبر</a></li>') + "</ul></div></div>" +
      '<div class="copy">© ' + new Date().getFullYear() + " صحيفة نبض الجزيرة – جميع الحقوق محفوظة</div></div></footer>";

    try { $("today").textContent = "ود مدني · " + new Date().toLocaleDateString("ar-SD", { weekday: "long", year: "numeric", month: "long", day: "numeric" }); } catch (e) {}
    var root = document.documentElement;
    try { var s = localStorage.getItem("nabd-theme"); if (s) root.setAttribute("data-theme", s); } catch (e) {}
    $("themeBtn").addEventListener("click", function () {
      var c = root.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      var n = c === "dark" ? "light" : "dark"; root.setAttribute("data-theme", n);
      try { localStorage.setItem("nabd-theme", n); } catch (e) {}
    });
  }

  function ticker() {
    N.getPosts({ breaking: true, limit: 6 }).then(function (l) {
      if (!l.length) return;
      $("tickerItems").innerHTML = l.concat(l).map(function (p) { return '<a href="' + link(p) + '"><span>' + esc(p.title) + "</span></a>"; }).join("");
      $("ticker").hidden = false;
    }).catch(function () {});
  }

  /* ---------- building blocks ---------- */
  function card(p) { return '<article class="card"><a href="' + link(p) + '">' + ph(p) + '</a><div class="body">' + chip(p) + '<h3><a href="' + link(p) + '">' + esc(p.title) + '</a></h3><span class="meta">' + N.ago(p.date) + "</span></div></article>"; }
  function mini(p) { return '<div class="mini"><a href="' + link(p) + '">' + ph(p) + "</a><div>" + chip(p) + '<h3><a href="' + link(p) + '">' + esc(p.title) + '</a></h3><span class="meta">' + N.ago(p.date) + "</span></div></div>"; }
  function lead(p) {
    return '<article class="lead"><a href="' + link(p) + '">' + ph(p) + '</a><div style="margin-top:12px">' + chip(p) + '</div><h1><a href="' + link(p) + '">' + esc(p.title) + "</a></h1>" +
      (p.excerpt ? "<p>" + esc(p.excerpt) + "</p>" : "") + '<span class="meta">' + N.ago(p.date) + (p.author ? " · " + esc(p.author) : "") + "</span></article>";
  }
  function sidebar() {
    var html = '<div class="box"><h4>الأكثر قراءة هذا الأسبوع</h4><ol class="most" id="mostRead"><li>…</li></ol></div>' +
      '<div class="box"><h4>تابعنا</h4><p class="meta">حمّل تطبيق «نبض الجزيرة» على أندرويد لتصلك الأخبار أولاً بأول.</p></div>';
    setTimeout(function () {
      N.getPosts({ popular: true, limit: 5 }).then(function (l) {
        var el = $("mostRead"); if (!el) return;
        el.innerHTML = l.length ? l.map(function (p) { return '<li><a href="' + link(p) + '">' + esc(p.title) + "</a></li>"; }).join("") : "<li>لا توجد بيانات بعد</li>";
      }).catch(function () {});
    });
    return html;
  }
  function failed() { return '<div class="empty">تعذّر تحميل الأخبار. تحقق من الاتصال ثم أعد تحميل الصفحة.</div>'; }

  /* ---------- pages ---------- */
  function home(cats) {
    var cat = +params.get("cat") || 0, q = (params.get("q") || "").trim(), pg = Math.max(1, +params.get("p") || 1);
    var main = $("main");
    if (cat || q) {
      var title = q ? "نتائج البحث عن: " + esc(q) : esc((cats.filter(function (c) { return c.id === cat; })[0] || {}).name || "القسم");
      document.title = (q ? "بحث" : (cats.filter(function (c) { return c.id === cat; })[0] || {}).name || "القسم") + " – نبض الجزيرة";
      main.innerHTML = '<h1 class="page-title">' + title + '</h1><div class="layout"><div id="list"><div class="skel"></div></div><aside>' + sidebar() + "</aside></div>";
      N.getPosts({ cat: cat, q: q, limit: PER_PAGE + 1, offset: (pg - 1) * PER_PAGE }).then(function (l) {
        var more = l.length > PER_PAGE; l = l.slice(0, PER_PAGE);
        var base = "/?" + (q ? "q=" + encodeURIComponent(q) : "cat=" + cat) + "&p=";
        $("list").innerHTML = l.length ? '<div class="grid4" style="margin-top:16px">' + l.map(card).join("") + "</div>" +
          '<div class="pager">' + (pg > 1 ? '<a href="' + base + (pg - 1) + '">→ الأحدث</a>' : "") + (more ? '<a href="' + base + (pg + 1) + '">الأقدم ←</a>' : "") + "</div>"
          : '<div class="empty">' + (q ? "لا توجد نتائج لبحثك." : "لا توجد أخبار في هذا القسم بعد.") + "</div>";
      }).catch(function () { $("list").innerHTML = failed(); });
      return;
    }
    main.innerHTML = '<div class="skel" style="min-height:420px;margin-top:24px"></div>';
    N.getPosts({ limit: 40 }).then(function (l) {
      if (!l.length) { main.innerHTML = '<div class="empty">لا توجد أخبار منشورة بعد. ابدأ بالنشر من <a href="/admin/" style="color:var(--brand)">لوحة التحكم</a>.</div>'; return; }
      var top = l.filter(function (p) { return p.featured; })[0] || l[0];
      var rest = l.filter(function (p) { return p !== top; });
      var side = rest.slice(0, 4), latest = rest.slice(4, 12);
      var html = '<section class="hero">' + lead(top) + '<div class="side-list">' + side.map(mini).join("") + "</div></section>";
      html += '<div class="layout"><div>';
      if (latest.length) html += '<div class="section-head"><h2>آخر الأخبار</h2></div><div class="grid4">' + latest.map(card).join("") + "</div>";
      cats.forEach(function (c) {
        var inCat = l.filter(function (p) { return p.cat === c.id; }).slice(0, 4);
        if (inCat.length >= 2) html += '<div class="cat-block"><div class="section-head"><h2>' + esc(c.name) + '</h2><a href="/?cat=' + c.id + '">المزيد ←</a></div><div class="grid4">' + inCat.map(card).join("") + "</div></div>";
      });
      html += "</div><aside>" + sidebar() + "</aside></div>";
      main.innerHTML = html;
    }).catch(function () { main.innerHTML = failed(); });
  }

  function article() {
    var id = +params.get("id"), main = $("main");
    if (!id) { location.replace("/"); return; }
    main.innerHTML = '<div class="skel" style="min-height:420px;margin-top:24px"></div>';
    N.getPost(id).then(function (p) {
      if (!p) { main.innerHTML = '<div class="empty">الخبر غير موجود أو لم يُنشر بعد. <a href="/" style="color:var(--brand)">العودة للرئيسية</a></div>'; return; }
      document.title = p.title + " – نبض الجزيرة";
      var meta = document.querySelector('meta[name="description"]'); if (meta) meta.setAttribute("content", p.excerpt || p.title);
      var url = location.origin + link(p), txt = encodeURIComponent(p.title + "\n" + url);
      main.innerHTML = '<div class="breadcrumb"><a href="/">الرئيسية</a>' + (p.cat ? ' / <a href="/?cat=' + p.cat + '">' + esc(p.catName) + "</a>" : "") + "</div>" +
        '<div class="article-page"><article class="article-main">' + ph(p) + '<div class="inner">' + chip(p) + "<h1>" + esc(p.title) + "</h1>" +
        (p.excerpt ? '<p class="lede">' + esc(p.excerpt) + "</p>" : "") +
        '<div class="meta">' + N.ago(p.date) + (p.author ? " · " + esc(p.author) : "") + '</div><hr style="border:0;border-top:1px solid var(--line);margin:16px 0">' +
        '<div class="article-content">' + N.renderContent(p.content) + "</div>" +
        '<div class="share"><a class="s-wa" target="_blank" rel="noopener" href="https://wa.me/?text=' + txt + '">واتساب</a>' +
        '<a class="s-fb" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(url) + '">فيسبوك</a>' +
        '<a class="s-x" target="_blank" rel="noopener" href="https://x.com/intent/post?text=' + txt + '">إكس</a>' +
        '<button class="s-copy" id="copyLink" type="button">نسخ الرابط</button></div></div></article>' +
        '<aside><div class="box"><h4>أخبار ذات صلة</h4><div id="related" class="side-list"></div></div>' + sidebar() + "</aside></div>";
      $("copyLink").addEventListener("click", function () {
        var b = this; (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { b.textContent = "تم النسخ ✓"; }, function () { prompt("انسخ الرابط:", url); });
      });
      N.addView(p.id);
      N.getPosts({ cat: p.cat, limit: 5 }).then(function (l) {
        l = l.filter(function (x) { return x.id !== p.id; }).slice(0, 4);
        $("related").innerHTML = l.length ? l.map(mini).join("") : '<p class="meta">لا توجد أخبار أخرى في هذا القسم بعد.</p>';
      }).catch(function () {});
    }).catch(function () { main.innerHTML = failed(); });
  }

  /* ---------- start ---------- */
  N.getCategories().catch(function () { return []; }).then(function (cats) {
    shell(cats); ticker();
    var page = document.body.dataset.page;
    if (page === "home") home(cats);
    else if (page === "article") article();
  });
})();
