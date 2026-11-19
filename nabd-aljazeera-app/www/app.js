(function () {
  "use strict";
  var CFG = window.NABD_CONFIG || {};
  var SITE = (CFG.WP_SITE || "").replace(/\/+$/, "");
  var DEMO = !SITE;
  var Plugins = (window.Capacitor && window.Capacitor.Plugins) || {};
  var $ = function (id) { return document.getElementById(id); };
  var LOGO = '<svg viewBox="0 0 64 64"><polyline points="8,34 20,34 25,22 31,46 37,16 42,34 56,34" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  var state = { tab: "home", cat: 0, page: 1, posts: [], cats: [], more: true, query: "", current: null };

  /* ---------- storage (safe) ---------- */
  function load(key, def) { try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
  function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function textOf(html) { var d = document.createElement("div"); d.innerHTML = html || ""; return (d.textContent || "").trim(); }
  function ago(iso) {
    var t = new Date(iso).getTime(); if (!t) return "";
    var m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return "الآن";
    if (m < 60) return "منذ " + m + " دقيقة";
    var h = Math.round(m / 60);
    if (h < 24) return h === 1 ? "منذ ساعة" : h === 2 ? "منذ ساعتين" : "منذ " + h + " ساعات";
    try { return new Date(t).toLocaleDateString("ar-SD", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return new Date(t).toDateString(); }
  }
  function toast(msg) { var t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(function () { t.hidden = true; }, 2200); }
  function sanitize(html) {
    var doc = new DOMParser().parseFromString("<div>" + (html || "") + "</div>", "text/html");
    doc.querySelectorAll("script,style,object,embed,form,link,meta").forEach(function (n) { n.remove(); });
    doc.querySelectorAll("iframe").forEach(function (f) {
      var src = f.getAttribute("src") || "";
      if (!/^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\//.test(src)) f.remove();
    });
    doc.querySelectorAll("*").forEach(function (el) {
      Array.prototype.slice.call(el.attributes).forEach(function (a) {
        if (/^on/i.test(a.name) || (/^(href|src)$/i.test(a.name) && /^\s*javascript:/i.test(a.value))) el.removeAttribute(a.name);
      });
      if (el.tagName === "A") { el.setAttribute("target", "_blank"); el.setAttribute("rel", "noopener"); }
      if (el.tagName === "IMG") el.setAttribute("loading", "lazy");
    });
    return doc.body.firstChild.innerHTML;
  }
  function img(p) { return '<div class="ph">' + LOGO + (p.image ? '<img src="' + esc(p.image) + '" alt="" loading="lazy">' : "") + "</div>"; }

  /* ---------- data ---------- */
  function normalize(p) {
    var media = p._embedded && p._embedded["wp:featuredmedia"] && p._embedded["wp:featuredmedia"][0];
    var terms = (p._embedded && p._embedded["wp:term"] && p._embedded["wp:term"][0]) || [];
    var author = p._embedded && p._embedded.author && p._embedded.author[0];
    var image = "";
    if (media) {
      var sz = media.media_details && media.media_details.sizes;
      image = (sz && (sz.medium_large || sz.large || sz.full) && (sz.medium_large || sz.large || sz.full).source_url) || media.source_url || "";
    }
    return {
      id: p.id,
      title: textOf(p.title && p.title.rendered),
      excerpt: textOf(p.excerpt && p.excerpt.rendered),
      content: (p.content && p.content.rendered) || "",
      date: p.date_gmt ? p.date_gmt + "Z" : p.date,
      cat: terms[0] ? terms[0].id : 0,
      catName: terms[0] ? textOf(terms[0].name) : "",
      image: image,
      link: p.link || "",
      author: author ? author.name : ""
    };
  }
  function api(path) {
    var ctrl = new AbortController(); var to = setTimeout(function () { ctrl.abort(); }, 15000);
    return fetch(SITE + "/wp-json/wp/v2/" + path, { signal: ctrl.signal }).then(function (r) {
      clearTimeout(to);
      if (!r.ok) { var e = new Error("HTTP " + r.status); e.status = r.status; throw e; }
      return r.json();
    });
  }
  function fetchCats() {
    if (DEMO) return Promise.resolve(window.NABD_DEMO.cats);
    return api("categories?per_page=50&orderby=count&order=desc&hide_empty=true&_fields=id,name,count")
      .then(function (list) { var c = list.filter(function (x) { return x.name !== "Uncategorized" && x.name !== "غير مصنف"; }).map(function (x) { return { id: x.id, name: textOf(x.name) }; }); save("nabd:cats", c); return c; })
      .catch(function () { return load("nabd:cats", []); });
  }
  function fetchPosts(opts) {
    if (DEMO) {
      var all = window.NABD_DEMO.posts.filter(function (p) {
        return (!opts.cat || p.cat === opts.cat) && (!opts.q || p.title.indexOf(opts.q) >= 0);
      });
      return Promise.resolve({ posts: opts.page > 1 ? [] : all, more: false, offline: false });
    }
    var n = CFG.POSTS_PER_PAGE || 20;
    var q = "posts?_embed=wp:featuredmedia,wp:term,author&per_page=" + n + "&page=" + opts.page +
      (opts.cat ? "&categories=" + opts.cat : "") + (opts.q ? "&search=" + encodeURIComponent(opts.q) : "");
    var cacheKey = "nabd:posts:" + (opts.cat || 0);
    return api(q).then(function (list) {
      var posts = list.map(normalize);
      if (opts.page === 1 && !opts.q) save(cacheKey, posts);
      return { posts: posts, more: posts.length === n, offline: false };
    }).catch(function (e) {
      if (e.status === 400) return { posts: [], more: false, offline: false }; // past last page
      if (opts.page === 1 && !opts.q) return { posts: load(cacheKey, []), more: false, offline: true };
      throw e;
    });
  }

  /* ---------- render: categories & ticker ---------- */
  function renderCats() {
    var html = '<button data-cat="0" class="' + (state.cat === 0 ? "active" : "") + '">الكل</button>' +
      state.cats.map(function (c) { return '<button data-cat="' + c.id + '" class="' + (state.cat === c.id ? "active" : "") + '">' + esc(c.name) + "</button>"; }).join("");
    $("cats").innerHTML = html;
    $("cats").hidden = state.tab !== "home";
  }
  function renderTicker(posts) {
    var top = posts.slice(0, 5);
    if (!top.length || state.tab !== "home") { $("ticker").hidden = true; return; }
    var items = top.concat(top).map(function (p) { return '<span data-id="' + p.id + '">' + esc(p.title) + "</span>"; }).join("");
    $("tickerItems").innerHTML = items;
    $("ticker").hidden = false;
  }

  /* ---------- render: lists ---------- */
  function rowHTML(p) {
    return '<article class="row" data-id="' + p.id + '"><div>' + (p.catName ? '<span class="chip">' + esc(p.catName) + "</span>" : "") +
      "<h3>" + esc(p.title) + '</h3><span class="meta">' + ago(p.date) + "</span></div>" + img(p) + "</article>";
  }
  function leadHTML(p) {
    return '<article class="lead" data-id="' + p.id + '">' + img(p) + '<div class="body">' + (p.catName ? '<span class="chip">' + esc(p.catName) + "</span>" : "") +
      "<h2>" + esc(p.title) + "</h2>" + (p.excerpt ? "<p>" + esc(p.excerpt.slice(0, 160)) + "</p>" : "") + '<span class="meta">' + ago(p.date) + "</span></div></article>";
  }
  function emptyHTML(msg) { return '<div class="empty"><svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="2"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/></svg><p>' + esc(msg) + "</p></div>"; }
  function skeleton() { $("view").innerHTML = '<div class="skeleton big"></div><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>'; }

  function renderHome() {
    var v = $("view"), p = state.posts;
    if (!p.length) { v.innerHTML = emptyHTML(state.query ? "لا توجد نتائج لبحثك" : "لا توجد أخبار حالياً. اسحب للأسفل للتحديث."); return; }
    var html = "";
    if (state.query) html += '<div class="section-title">نتائج البحث عن: ' + esc(state.query) + "</div>";
    html += leadHTML(p[0]);
    if (p.length > 1) html += '<div class="section-title">' + (state.cat ? "آخر الأخبار في القسم" : "آخر الأخبار") + "</div>";
    html += p.slice(1).map(rowHTML).join("");
    if (state.more) html += '<button class="more" id="moreBtn">عرض المزيد</button>';
    v.innerHTML = html;
  }

  function loadHome(reset) {
    if (reset) { state.page = 1; state.posts = []; state.more = true; skeleton(); }
    return fetchPosts({ cat: state.cat, page: state.page, q: state.query }).then(function (res) {
      state.posts = state.page === 1 ? res.posts : state.posts.concat(res.posts);
      state.more = res.more;
      $("offline").hidden = !res.offline;
      if (state.page === 1 && !state.query) renderTicker(state.posts);
      renderHome();
    }).catch(function () {
      if (state.page === 1) $("view").innerHTML = emptyHTML("تعذّر تحميل الأخبار. تحقق من الاتصال ثم حاول مجدداً.");
      else toast("تعذّر تحميل المزيد");
    });
  }

  function renderSections() {
    $("view").innerHTML = '<div class="section-title">أقسام الصحيفة</div><div class="grid-sections">' +
      state.cats.map(function (c) { return '<button data-gocat="' + c.id + '">' + esc(c.name) + "</button>"; }).join("") + "</div>";
  }
  function renderSaved() {
    var s = load("nabd:saved", []);
    $("view").innerHTML = '<div class="section-title">الأخبار المحفوظة</div>' +
      (s.length ? s.map(rowHTML).join("") : emptyHTML("لم تحفظ أي خبر بعد. اضغط على علامة الحفظ داخل الخبر لقراءته لاحقاً حتى دون إنترنت."));
  }
  function renderAbout() {
    var wa = CFG.CONTACT_WHATSAPP ? '<a class="btn" href="https://wa.me/' + esc(CFG.CONTACT_WHATSAPP) + '" target="_blank" rel="noopener">راسلنا على واتساب</a>' : "";
    var mail = CFG.CONTACT_EMAIL ? '<a class="btn alt" href="mailto:' + esc(CFG.CONTACT_EMAIL) + '">البريد الإلكتروني</a>' : "";
    var fb = CFG.FACEBOOK_URL ? '<a class="btn alt" href="' + esc(CFG.FACEBOOK_URL) + '" target="_blank" rel="noopener">صفحتنا على فيسبوك</a>' : "";
    var privacy = CFG.PRIVACY_URL ? '<a class="btn alt" href="' + esc(CFG.PRIVACY_URL) + '" target="_blank" rel="noopener">سياسة الخصوصية</a>' : '<a class="btn alt" href="privacy.html">سياسة الخصوصية</a>';
    $("view").innerHTML =
      '<div class="card"><h3>نبض الجزيرة</h3><p>صحيفة إخبارية تهتم بشؤون ولاية الجزيرة وإنسانها: الأخبار والتحقيقات والزراعة والخدمات والرياضة والثقافة.</p></div>' +
      '<div class="card"><h3>راسلنا بخبر</h3><p>لديك خبر أو صورة من منطقتك؟ أرسلها لنا.</p>' + wa + mail + fb + "</div>" +
      '<div class="card"><h3>الخصوصية</h3><p>التطبيق لا يطلب تسجيل دخول ولا يجمع بيانات شخصية. الأخبار المحفوظة تبقى على جهازك فقط.</p>' + privacy + "</div>" +
      '<p class="meta" style="text-align:center">الإصدار ' + esc(CFG.APP_VERSION || "1.0.0") + "</p>";
  }

  function setTab(tab) {
    state.tab = tab;
    document.querySelectorAll(".tabbar button").forEach(function (b) { b.classList.toggle("active", b.dataset.tab === tab); });
    $("cats").hidden = tab !== "home";
    $("ticker").hidden = tab !== "home" || !$("tickerItems").children.length;
    window.scrollTo(0, 0);
    if (tab === "home") { renderCats(); renderHome(); }
    else if (tab === "sections") renderSections();
    else if (tab === "saved") renderSaved();
    else renderAbout();
  }

  /* ---------- article ---------- */
  function findPost(id) {
    id = +id;
    return state.posts.concat(load("nabd:saved", [])).filter(function (p) { return p.id === id; })[0];
  }
  function isSaved(id) { return load("nabd:saved", []).some(function (p) { return p.id === id; }); }
  function openArticle(p) {
    if (!p) return;
    state.current = p;
    var related = state.posts.filter(function (x) { return x.id !== p.id && x.cat === p.cat; }).slice(0, 3);
    $("articleScroll").innerHTML = img(p) + '<div class="article-body">' +
      (p.catName ? '<span class="chip">' + esc(p.catName) + "</span>" : "") +
      "<h1>" + esc(p.title) + '</h1><div class="meta">' + ago(p.date) + (p.author ? " · " + esc(p.author) : "") + "</div>" +
      '<div class="article-content">' + sanitize(p.content) + "</div>" +
      '<div class="share-row"><button class="s-wa" data-share="wa">واتساب</button><button class="s-fb" data-share="fb">فيسبوك</button><button class="s-more" data-share="more">مشاركة</button></div></div>' +
      (related.length ? '<div class="related"><div class="section-title">أخبار ذات صلة</div>' + related.map(rowHTML).join("") + "</div>" : "");
    $("articleScroll").scrollTop = 0;
    $("saveBtn").classList.toggle("on", isSaved(p.id));
    $("article").hidden = false;
    if (history.state !== "article") history.pushState("article", "");
  }
  function closeArticle() { $("article").hidden = true; state.current = null; }

  function shareText(p) { return p.title + (p.link ? "\n" + p.link : "") + "\n— تطبيق نبض الجزيرة"; }
  function openUrl(url) { window.open(url, "_blank"); }
  function share(kind) {
    var p = state.current; if (!p) return;
    if (kind === "wa") return openUrl("https://wa.me/?text=" + encodeURIComponent(shareText(p)));
    if (kind === "fb") { if (!p.link) return toast("رابط الخبر غير متوفر في الوضع التجريبي"); return openUrl("https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(p.link)); }
    if (Plugins.Share) return Plugins.Share.share({ title: p.title, text: shareText(p), url: p.link || undefined, dialogTitle: "مشاركة الخبر" }).catch(function () {});
    if (navigator.share) return navigator.share({ title: p.title, text: shareText(p), url: p.link || undefined }).catch(function () {});
    openUrl("https://wa.me/?text=" + encodeURIComponent(shareText(p)));
  }
  function toggleSave() {
    var p = state.current; if (!p) return;
    var s = load("nabd:saved", []);
    if (isSaved(p.id)) { s = s.filter(function (x) { return x.id !== p.id; }); toast("أُزيل من المحفوظات"); }
    else { s.unshift(p); s = s.slice(0, 100); toast("تم الحفظ – يمكنك قراءته دون إنترنت"); }
    save("nabd:saved", s);
    $("saveBtn").classList.toggle("on", isSaved(p.id));
    if (state.tab === "saved") renderSaved();
  }
  var sizes = ["1rem", "1.08rem", "1.2rem", "1.35rem"];
  function cycleFont() {
    var i = (sizes.indexOf(load("nabd:fs", "1.08rem")) + 1) % sizes.length;
    save("nabd:fs", sizes[i]); document.documentElement.style.setProperty("--fs", sizes[i]);
  }

  /* ---------- pull to refresh ---------- */
  function setupPTR() {
    var startY = null, ptr = document.createElement("div"); ptr.className = "ptr"; ptr.textContent = "اسحب للتحديث";
    $("view").parentNode.insertBefore(ptr, $("view"));
    window.addEventListener("touchstart", function (e) { if (window.scrollY === 0 && state.tab === "home" && $("article").hidden) startY = e.touches[0].clientY; }, { passive: true });
    window.addEventListener("touchmove", function (e) {
      if (startY == null) return; var d = e.touches[0].clientY - startY;
      if (d > 0) { ptr.style.height = Math.min(d / 2.5, 48) + "px"; ptr.textContent = d > 110 ? "أفلت للتحديث" : "اسحب للتحديث"; }
    }, { passive: true });
    window.addEventListener("touchend", function () {
      if (startY == null) return; var go = parseFloat(ptr.style.height) >= 44; startY = null;
      if (go) { ptr.textContent = "جارٍ التحديث…"; loadHome(true).then(function () { ptr.style.height = "0"; }); }
      else ptr.style.height = "0";
    });
  }

  /* ---------- events ---------- */
  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-id],[data-cat],[data-gocat],[data-tab],[data-share],#moreBtn");
    if (!t) return;
    if (t.id === "moreBtn") { t.disabled = true; t.textContent = "جارٍ التحميل…"; state.page++; loadHome(false); return; }
    if (t.dataset.share) return share(t.dataset.share);
    if (t.dataset.tab) return setTab(t.dataset.tab);
    if (t.dataset.gocat) { state.cat = +t.dataset.gocat; state.query = ""; setTab("home"); loadHome(true); return; }
    if (t.dataset.cat != null && t.closest("#cats")) {
      state.cat = +t.dataset.cat; state.query = ""; renderCats(); window.scrollTo(0, 0); loadHome(true);
      t.scrollIntoView({ inline: "center", block: "nearest" }); return;
    }
    if (t.dataset.id) openArticle(findPost(t.dataset.id));
  });
  $("backBtn").addEventListener("click", function () { history.back(); });
  $("shareBtn").addEventListener("click", function () { share("more"); });
  $("saveBtn").addEventListener("click", toggleSave);
  $("fontBtn").addEventListener("click", cycleFont);
  $("searchBtn").addEventListener("click", function () { var s = $("searchbar"); s.hidden = !s.hidden; if (!s.hidden) $("searchInput").focus(); });
  function doSearch() {
    state.query = $("searchInput").value.trim(); state.cat = 0;
    $("searchInput").blur(); setTab("home"); loadHome(true);
  }
  $("searchGo").addEventListener("click", doSearch);
  $("searchInput").addEventListener("keydown", function (e) { if (e.key === "Enter") doSearch(); });
  window.addEventListener("popstate", function () { if (!$("article").hidden) closeArticle(); });
  window.addEventListener("online", function () { if (state.tab === "home" && !$("offline").hidden) loadHome(true); });

  // Android hardware back button
  if (Plugins.App) {
    Plugins.App.addListener("backButton", function () {
      if (!$("article").hidden) { history.back(); return; }
      if (!$("searchbar").hidden) { $("searchbar").hidden = true; if (state.query) { state.query = ""; $("searchInput").value = ""; loadHome(true); } return; }
      if (state.tab !== "home") { setTab("home"); return; }
      if (state.cat !== 0) { state.cat = 0; renderCats(); loadHome(true); return; }
      Plugins.App.exitApp();
    });
  }

  document.addEventListener("error", function (e) { if (e.target && e.target.tagName === "IMG" && e.target.parentNode && e.target.parentNode.classList.contains("ph")) e.target.remove(); }, true);

  /* ---------- start ---------- */
  document.documentElement.style.setProperty("--fs", load("nabd:fs", "1.08rem"));
  $("demo").hidden = !DEMO;
  setupPTR();
  skeleton();
  fetchCats().then(function (c) { state.cats = c; renderCats(); });
  loadHome(true).then(function () {
    if (Plugins.SplashScreen) Plugins.SplashScreen.hide().catch(function () {});
  });
})();
