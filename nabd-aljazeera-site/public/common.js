/* أدوات مشتركة: جلب البيانات من Supabase وتنسيق المحتوى */
(function () {
  "use strict";
  var CFG = window.NABD_CONFIG || {};
  var URL_ = (CFG.SUPABASE_URL || "").replace(/\/+$/, "");
  var KEY = CFG.SUPABASE_KEY || "";
  var DEMO = !(URL_ && KEY);

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function ago(iso) {
    var t = new Date(iso).getTime(); if (!t) return "";
    var m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return "الآن";
    if (m < 60) return "منذ " + m + " دقيقة";
    var h = Math.round(m / 60);
    if (h < 24) return h === 1 ? "منذ ساعة" : h === 2 ? "منذ ساعتين" : "منذ " + h + " ساعات";
    try { return new Date(t).toLocaleDateString("ar-SD", { day: "numeric", month: "long", year: "numeric" }); } catch (e) { return new Date(t).toDateString(); }
  }

  /* نص الخبر: فقرات مفصولة بسطر فارغ.
     "## " عنوان فرعي، "> " اقتباس، رابط يوتيوب في سطر مستقل = فيديو، رابط عادي يصبح قابلاً للضغط */
  function youtubeId(u) {
    var m = String(u).trim().match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
    return m ? m[1] : null;
  }
  function linkify(s) {
    return esc(s).replace(/https?:\/\/[^\s<]+/g, function (u) { return '<a href="' + u + '" target="_blank" rel="noopener">' + u + "</a>"; });
  }
  function renderContent(text) {
    return String(text || "").replace(/\r/g, "").split(/\n\s*\n/).map(function (block) {
      block = block.trim(); if (!block) return "";
      var yt = youtubeId(block);
      if (yt && block.indexOf("\n") < 0 && !/\s/.test(block)) return '<div class="video-embed"><iframe src="https://www.youtube-nocookie.com/embed/' + yt + '" allowfullscreen loading="lazy" title="فيديو"></iframe></div>';
      if (/^##\s+/.test(block)) return "<h2>" + esc(block.replace(/^##\s+/, "")) + "</h2>";
      if (/^>\s?/.test(block)) return "<blockquote>" + linkify(block.replace(/^>\s?/gm, "")).replace(/\n/g, "<br>") + "</blockquote>";
      return "<p>" + linkify(block).replace(/\n/g, "<br>") + "</p>";
    }).join("");
  }

  function normalize(p) {
    return {
      id: p.id, title: p.title, excerpt: p.excerpt || "", content: p.content || "",
      image: p.image_url || "", cat: p.category_id || 0, catName: (p.categories && p.categories.name) || p.catName || "",
      author: p.author || "", date: p.published_at, breaking: !!p.is_breaking, featured: !!p.is_featured, views: p.views || 0
    };
  }

  function rest(path) {
    var ctrl = new AbortController(); var to = setTimeout(function () { ctrl.abort(); }, 15000);
    return fetch(URL_ + "/rest/v1/" + path, { headers: { apikey: KEY, Authorization: "Bearer " + KEY }, signal: ctrl.signal })
      .then(function (r) { clearTimeout(to); if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
  }

  var SELECT = "select=id,title,excerpt,content,image_url,category_id,author,is_breaking,is_featured,published_at,views,categories(name)";

  /* opts: {cat, q, limit, offset, breaking, popular} */
  function getPosts(opts) {
    opts = opts || {};
    if (DEMO) {
      var all = window.NABD_DEMO.posts.filter(function (p) {
        return (!opts.cat || p.cat === opts.cat) && (!opts.q || p.title.indexOf(opts.q) >= 0) && (!opts.breaking || p.breaking);
      });
      if (opts.popular) all = all.slice().sort(function (a, b) { return b.views - a.views; });
      return Promise.resolve(all.slice(opts.offset || 0, (opts.offset || 0) + (opts.limit || 20)));
    }
    var q = "posts?" + SELECT + "&order=" + (opts.popular ? "views.desc" : "published_at.desc") +
      "&limit=" + (opts.limit || 20) + "&offset=" + (opts.offset || 0);
    if (opts.cat) q += "&category_id=eq." + (+opts.cat);
    if (opts.breaking) q += "&is_breaking=eq.true";
    if (opts.popular) q += "&published_at=gte." + new Date(Date.now() - 7 * 864e5).toISOString();
    if (opts.q) { var s = opts.q.replace(/[,()*%]/g, " ").trim(); q += "&or=(title.ilike.*" + encodeURIComponent(s) + "*,content.ilike.*" + encodeURIComponent(s) + "*)"; }
    return rest(q).then(function (l) { return l.map(normalize); });
  }
  function getPost(id) {
    if (DEMO) return Promise.resolve(window.NABD_DEMO.posts.filter(function (p) { return p.id === +id; })[0] || null);
    return rest("posts?" + SELECT + "&id=eq." + (+id)).then(function (l) { return l[0] ? normalize(l[0]) : null; });
  }
  function getCategories() {
    if (DEMO) return Promise.resolve(window.NABD_DEMO.cats);
    return rest("categories?select=id,name&order=sort.asc");
  }
  function addView(id) {
    if (DEMO) return;
    try { var k = "nabd:v:" + id; if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, "1"); } catch (e) {}
    fetch(URL_ + "/rest/v1/rpc/increment_views", { method: "POST", headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" }, body: JSON.stringify({ post_id: +id }) }).catch(function () {});
  }

  window.NABD = { CFG: CFG, DEMO: DEMO, esc: esc, ago: ago, renderContent: renderContent, getPosts: getPosts, getPost: getPost, getCategories: getCategories, addView: addView };
})();
