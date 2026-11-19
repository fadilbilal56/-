(function () {
  "use strict";
  var CFG = window.NABD_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function msg(el, text, ok) { $(el).innerHTML = text ? '<div class="msg ' + (ok ? "ok" : "err") + '">' + esc(text) + "</div>" : ""; }
  function arErr(e) {
    var m = (e && (e.message || e.error_description)) || String(e);
    if (/Invalid login credentials/i.test(m)) return "البريد أو كلمة المرور غير صحيحة.";
    if (/Email not confirmed/i.test(m)) return "لم يتم تأكيد البريد بعد. افتح رسالة التأكيد في بريدك أولاً.";
    if (/already registered/i.test(m)) return "هذا البريد مسجّل مسبقاً. استخدم «تسجيل الدخول».";
    if (/Password should be/i.test(m)) return "كلمة المرور قصيرة. استخدم 8 أحرف على الأقل.";
    if (/row-level security|permission denied/i.test(m)) return "ليست لديك صلاحية لهذا الإجراء.";
    if (/rate limit/i.test(m)) return "محاولات كثيرة. انتظر قليلاً ثم حاول مجدداً.";
    if (/Failed to fetch|NetworkError/i.test(m)) return "تعذّر الاتصال. تحقق من الإنترنت.";
    return m;
  }

  if (!CFG.SUPABASE_URL || !CFG.SUPABASE_KEY || !window.supabase) { $("notConfigured").hidden = false; return; }
  var sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY);
  var me = null, cats = [], posts = [], page = 0, PAGE = 30, editing = null, imgFile = null, removeImg = false, authMode = "in";

  /* ---------- auth ---------- */
  document.querySelectorAll("[data-auth]").forEach(function (b) {
    b.addEventListener("click", function () {
      authMode = b.dataset.auth;
      document.querySelectorAll("[data-auth]").forEach(function (x) { x.classList.toggle("on", x === b); });
      $("authBtn").textContent = authMode === "in" ? "دخول" : "إنشاء الحساب";
      $("pass").autocomplete = authMode === "in" ? "current-password" : "new-password";
      msg("authMsg", "");
    });
  });
  $("authBtn").addEventListener("click", function () {
    var email = $("email").value.trim().toLowerCase(), pass = $("pass").value;
    if (!email || !pass) return msg("authMsg", "اكتب البريد وكلمة المرور.");
    var b = this; b.disabled = true;
    var p = authMode === "in" ? sb.auth.signInWithPassword({ email: email, password: pass })
      : sb.auth.signUp({ email: email, password: pass, options: { emailRedirectTo: location.origin + "/admin/" } });
    p.then(function (r) {
      if (r.error) throw r.error;
      if (authMode === "up" && !r.data.session) msg("authMsg", "تم إنشاء الحساب. افتح الرسالة التي وصلت إلى بريدك لتأكيده، ثم سجّل الدخول.", true);
    }).catch(function (e) { msg("authMsg", arErr(e)); }).then(function () { b.disabled = false; });
  });
  $("resetBtn").addEventListener("click", function () {
    var email = $("email").value.trim().toLowerCase();
    if (!email) return msg("authMsg", "اكتب بريدك أولاً ثم اضغط «نسيت كلمة المرور».");
    sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + "/admin/" }).then(function (r) {
      if (r.error) throw r.error; msg("authMsg", "أرسلنا رابط تعيين كلمة المرور إلى بريدك.", true);
    }).catch(function (e) { msg("authMsg", arErr(e)); });
  });
  $("logoutBtn").addEventListener("click", function () { sb.auth.signOut(); });

  sb.auth.onAuthStateChange(function (event, session) {
    if (event === "PASSWORD_RECOVERY") {
      var np = prompt("اكتب كلمة المرور الجديدة (8 أحرف على الأقل):");
      if (np) sb.auth.updateUser({ password: np }).then(function (r) { alert(r.error ? arErr(r.error) : "تم تغيير كلمة المرور."); });
    }
    setTimeout(function () { route(session); });
  });

  function route(session) {
    ["loginView", "noAccess", "dash"].forEach(function (id) { $(id).hidden = true; });
    $("logoutBtn").hidden = !session; $("who").textContent = session ? session.user.email : "";
    if (!session) { $("loginView").hidden = false; return; }
    var email = (session.user.email || "").toLowerCase();
    sb.from("editors").select("email,role,name").eq("email", email).maybeSingle().then(function (r) {
      if (r.error || !r.data) { $("noAccess").hidden = false; return; }
      me = r.data; $("dash").hidden = false; $("editorsTab").hidden = me.role !== "admin";
      return loadCats().then(function () { show("list"); });
    });
  }

  /* ---------- views ---------- */
  function show(v) {
    ["list", "edit", "editors", "help"].forEach(function (x) { $("v-" + x).hidden = x !== v; });
    document.querySelectorAll("#mainTabs button").forEach(function (b) { b.classList.toggle("on", b.dataset.view === v); });
    if (v === "list") { page = 0; posts = []; loadPosts(); }
    if (v === "editors") loadEditors();
    window.scrollTo(0, 0);
  }
  document.querySelectorAll("#mainTabs button").forEach(function (b) {
    b.addEventListener("click", function () { if (b.dataset.view === "edit") openEditor(null); else show(b.dataset.view); });
  });

  function loadCats() {
    return sb.from("categories").select("id,name").order("sort").then(function (r) {
      cats = r.data || [];
      $("f-cat").innerHTML = cats.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + "</option>"; }).join("");
    });
  }
  function catName(id) { return (cats.filter(function (c) { return c.id === id; })[0] || {}).name || "—"; }
  function fmt(iso) { try { return new Date(iso).toLocaleString("ar-SD", { dateStyle: "medium", timeStyle: "short" }); } catch (e) { return iso; } }

  function loadPosts() {
    var q = sb.from("posts").select("id,title,category_id,published,is_breaking,is_featured,published_at,views")
      .order("published_at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
    var f = $("filter").value.trim(); if (f) q = q.ilike("title", "%" + f.replace(/[%_]/g, "") + "%");
    q.then(function (r) {
      if (r.error) { $("postsBody").innerHTML = '<tr><td colspan="5">' + esc(arErr(r.error)) + "</td></tr>"; return; }
      posts = posts.concat(r.data); $("moreBtn").hidden = r.data.length < PAGE;
      $("postsBody").innerHTML = posts.length ? posts.map(function (p) {
        var future = new Date(p.published_at) > new Date();
        return '<tr><td class="t" data-edit="' + p.id + '">' + esc(p.title) + '</td><td class="hide-sm">' + esc(catName(p.category_id)) + "</td><td>" +
          (p.published ? (future ? '<span class="badge b-ft">مجدول</span>' : '<span class="badge b-pub">منشور</span>') : '<span class="badge b-draft">مسودة</span>') +
          (p.is_breaking ? '<span class="badge b-br">عاجل</span>' : "") + (p.is_featured ? '<span class="badge b-ft">رئيسي</span>' : "") +
          '</td><td class="hide-sm">' + esc(fmt(p.published_at)) + '</td><td class="hide-sm">' + p.views + "</td></tr>";
      }).join("") : '<tr><td colspan="5">لا توجد أخبار بعد. اضغط «+ خبر جديد».</td></tr>';
    });
  }
  $("moreBtn").addEventListener("click", function () { page++; loadPosts(); });
  var ft; $("filter").addEventListener("input", function () { clearTimeout(ft); ft = setTimeout(function () { page = 0; posts = []; loadPosts(); }, 350); });
  $("postsBody").addEventListener("click", function (e) {
    var td = e.target.closest("[data-edit]"); if (!td) return;
    sb.from("posts").select("*").eq("id", +td.dataset.edit).single().then(function (r) { if (r.data) openEditor(r.data); });
  });

  /* ---------- editor ---------- */
  function localDT(d) { var z = new Date(d); z.setMinutes(z.getMinutes() - z.getTimezoneOffset()); return z.toISOString().slice(0, 16); }
  function openEditor(p) {
    editing = p; imgFile = null; removeImg = false; msg("editMsg", "");
    $("editTitle").textContent = p ? "تعديل الخبر" : "خبر جديد";
    $("f-title").value = p ? p.title : ""; $("f-excerpt").value = p ? p.excerpt || "" : "";
    $("f-cat").value = p && p.category_id ? p.category_id : (cats[0] ? cats[0].id : "");
    $("f-author").value = p ? p.author || "" : (me && me.name) || "";
    $("f-content").value = p ? p.content : ""; $("f-date").value = localDT(p ? p.published_at : new Date());
    $("f-pub").checked = p ? p.published : true; $("f-br").checked = p ? p.is_breaking : false; $("f-ft").checked = p ? p.is_featured : false;
    $("f-img").value = ""; setPreview(p && p.image_url);
    $("delBtn").hidden = !p; $("previewBtn").hidden = !p;
    ["list", "editors", "help"].forEach(function (x) { $("v-" + x).hidden = true; }); $("v-edit").hidden = false;
    document.querySelectorAll("#mainTabs button").forEach(function (b) { b.classList.toggle("on", b.dataset.view === "edit"); });
    window.scrollTo(0, 0); $("f-title").focus();
  }
  function setPreview(src) { $("f-imgprev").hidden = !src; $("rmImg").hidden = !src; if (src) $("f-imgprev").src = src; else $("f-imgprev").removeAttribute("src"); }
  $("f-img").addEventListener("change", function () {
    var f = this.files[0]; if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { msg("editMsg", "نوع الصورة غير مدعوم."); this.value = ""; return; }
    imgFile = f; removeImg = false; setPreview(URL.createObjectURL(f));
  });
  $("rmImg").addEventListener("click", function () { imgFile = null; removeImg = true; $("f-img").value = ""; setPreview(null); });

  // تصغير الصورة إلى عرض 1600 بكسل كحد أقصى لتوفير باقة القراء
  function shrink(file) {
    return new Promise(function (res) {
      var img = new Image(); img.onload = function () {
        var max = 1600, w = img.naturalWidth, h = img.naturalHeight;
        if (w <= max && file.size < 600 * 1024) return res(file);
        var s = Math.min(1, max / w), c = document.createElement("canvas"); c.width = Math.round(w * s); c.height = Math.round(h * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(function (b) { res(b || file); }, "image/jpeg", 0.82);
      }; img.onerror = function () { res(file); }; img.src = URL.createObjectURL(file);
    });
  }
  function uploadImage() {
    if (!imgFile) return Promise.resolve(removeImg ? null : (editing ? editing.image_url : null));
    return shrink(imgFile).then(function (blob) {
      var ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
      var path = new Date().toISOString().slice(0, 7) + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "." + ext;
      return sb.storage.from("images").upload(path, blob, { contentType: blob.type || "image/jpeg", cacheControl: "31536000" }).then(function (r) {
        if (r.error) throw r.error;
        return sb.storage.from("images").getPublicUrl(path).data.publicUrl;
      });
    });
  }

  $("saveBtn").addEventListener("click", function () {
    var title = $("f-title").value.trim(), content = $("f-content").value.trim();
    if (title.length < 3) return msg("editMsg", "اكتب عنواناً للخبر.");
    if (!content) return msg("editMsg", "اكتب نص الخبر.");
    var b = this; b.disabled = true; b.textContent = "جارٍ الحفظ…";
    uploadImage().then(function (url) {
      var row = {
        title: title, excerpt: $("f-excerpt").value.trim() || null, content: content, image_url: url,
        category_id: +$("f-cat").value || null, author: $("f-author").value.trim() || null,
        published: $("f-pub").checked, is_breaking: $("f-br").checked, is_featured: $("f-ft").checked,
        published_at: $("f-date").value ? new Date($("f-date").value).toISOString() : new Date().toISOString()
      };
      var q = editing ? sb.from("posts").update(row).eq("id", editing.id).select().single() : sb.from("posts").insert(row).select().single();
      return q.then(function (r) {
        if (r.error) throw r.error;
        // خبر رئيسي واحد فقط في كل وقت
        var after = row.is_featured ? sb.from("posts").update({ is_featured: false }).eq("is_featured", true).neq("id", r.data.id) : Promise.resolve();
        return Promise.resolve(after).then(function () {
          editing = r.data; imgFile = null; removeImg = false; $("f-img").value = ""; setPreview(r.data.image_url);
          $("delBtn").hidden = false; $("previewBtn").hidden = false; $("editTitle").textContent = "تعديل الخبر";
          msg("editMsg", row.published ? "تم الحفظ والنشر ✓ – يظهر الآن في الموقع والتطبيق." : "تم الحفظ كمسودة ✓", true);
        });
      });
    }).catch(function (e) { msg("editMsg", arErr(e)); }).then(function () { b.disabled = false; b.textContent = "حفظ"; });
  });
  $("previewBtn").addEventListener("click", function () { if (editing) window.open("/article.html?id=" + editing.id, "_blank"); });
  $("delBtn").addEventListener("click", function () {
    if (!editing || !confirm("حذف هذا الخبر نهائياً؟")) return;
    var img = editing.image_url, marker = "/storage/v1/object/public/images/";
    sb.from("posts").delete().eq("id", editing.id).then(function (r) {
      if (r.error) return msg("editMsg", arErr(r.error));
      if (img && img.indexOf(marker) > 0) sb.storage.from("images").remove([decodeURIComponent(img.split(marker)[1])]);
      show("list");
    });
  });

  /* ---------- editors ---------- */
  function loadEditors() {
    sb.from("editors").select("*").order("created_at").then(function (r) {
      $("editorsBody").innerHTML = (r.data || []).map(function (e) {
        return "<tr><td dir=\"ltr\" style=\"text-align:right\">" + esc(e.email) + "</td><td>" + esc(e.name || "") + "</td><td>" + (e.role === "admin" ? "مدير" : "محرر") + "</td><td>" +
          (e.email !== me.email ? '<button class="btn danger" data-del-ed="' + esc(e.email) + '" style="padding:2px 10px">حذف</button>' : "") + "</td></tr>";
      }).join("");
    });
  }
  $("addEditor").addEventListener("click", function () {
    var email = $("e-email").value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return msg("edMsg", "اكتب بريداً صحيحاً.");
    sb.from("editors").upsert({ email: email, name: $("e-name").value.trim() || null, role: $("e-role").value }).then(function (r) {
      if (r.error) return msg("edMsg", arErr(r.error));
      msg("edMsg", "تمت الإضافة. أخبر المحرر أن يفتح هذه الصفحة ويختار «إنشاء حساب جديد» بنفس البريد.", true);
      $("e-email").value = ""; $("e-name").value = ""; loadEditors();
    });
  });
  $("editorsBody").addEventListener("click", function (e) {
    var b = e.target.closest("[data-del-ed]"); if (!b || !confirm("إزالة صلاحية هذا المحرر؟")) return;
    sb.from("editors").delete().eq("email", b.dataset.delEd).then(function (r) { if (r.error) msg("edMsg", arErr(r.error)); loadEditors(); });
  });
})();
