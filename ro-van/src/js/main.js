/*
Template Name: rovan
File Name: main.js
Author Name: ThemeVault
Author URI: https://www.themevault.net/
Version: 2.0

Dependency-free. Bootstrap's own bundle drives the navbar, tabs, carousel,
accordion and scrollspy; everything below replaces what jQuery and its plugins
used to do.
*/
(function () {
    "use strict";

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* BS3 marked the active tab on the <li>; BS5 marks the <a>. Templates key CSS on li.active (flowerspetal, wrap-d-style) — keep both in step */
    /* BS3's tab plugin worked from any trigger; BS5's needs a .nav / .list-group / [role=tablist] ancestor or it silently does nothing
       (homeapart: eight grid columns switch the portfolio panes). Give such triggers their nearest .row as the tablist. */
    document.querySelectorAll('[data-bs-toggle="tab"], [data-bs-toggle="pill"]').forEach(function (t) {
        if (t.closest('.nav, .list-group, [role="tablist"]')) return;
        var host = t.closest(".row") || t.parentElement.parentElement; if (host && !host.getAttribute("role")) host.setAttribute("role", "tablist");
    });
    /* BS5's scrollspy marks the <a>.active and colours it at (0,3,0) — above a template's ".navbar-default .navbar-nav > li > a" (0,2,2), so
       the spied item went grey (homeapart's "About" on the tablet). BS3 marked the <li>; do the same and take the class off the <a>. */
    document.addEventListener("activate.bs.scrollspy", function (e) {
        var a = e.relatedTarget; if (!a || !a.closest) return;
        var ul = a.closest(".navbar-nav, .nav, ul"); if (ul) ul.querySelectorAll("li.active").forEach(function (li) { li.classList.remove("active"); });
        var li = a.closest("li"); if (li) li.classList.add("active");
        a.classList.remove("active");
    });
    document.addEventListener("shown.bs.tab", function (e) { var a = e.target, ul = a.closest('.nav, [role="tablist"]'); if (!ul) return; ul.querySelectorAll("li").forEach(function (li) { li.classList.remove("active"); }); ul.querySelectorAll("[data-bs-toggle]").forEach(function (t) { if (t !== a) t.classList.remove("active"); }); var li = a.closest("li"); if (li) li.classList.add("active"); });
    /* BS3 marked an open dropdown's parent with .open; BS5 uses .show. Templates
       key CSS on .open (wrap-d-style slides its cart panel in on it) — mirror it. */
    document.addEventListener("shown.bs.dropdown", function (e) { var p = e.target.closest(".dropdown, .btn-group, .dropup") || e.target.parentElement; if (p) p.classList.add("open"); });
    document.addEventListener("hidden.bs.dropdown", function (e) { var p = e.target.closest(".dropdown, .btn-group, .dropup") || e.target.parentElement; if (p) p.classList.remove("open"); });

    /* Tapping a link in the collapsed menu closes it. The dropdown-toggle
       exclusion matters: without it, adding a submenu later makes the whole
       menu retract the moment it is tapped. */
    var collapse = document.querySelector(".navbar-collapse");
    if (collapse) {
        collapse.addEventListener("click", function (e) {
            /* any destination: a .dropdown-item or a bare submenu <a href> too, never an href-less submenu opener */
            var link = e.target.closest("a[href]");
            if (!link || link.classList.contains("dropdown-toggle") || link.getAttribute("href") === "#") return;
            if (!collapse.classList.contains("show")) return;
            var inst = window.bootstrap && bootstrap.Collapse.getInstance(collapse);
            if (inst) inst.hide();
        });
    }

    /* Counters — replaces counterUp + waypoints. The real number stays in the
       markup until the moment it animates, so anyone without JS still sees it. */
    var counters = document.querySelectorAll(".counter");
    if (counters.length) {
        var runCounter = function (el) {
            var target = parseInt(String(el.dataset.target || el.textContent).replace(/\D/g, ""), 10);
            if (!isFinite(target)) return;
            if (reduceMotion) { el.textContent = String(target); return; }
            el.textContent = "0";
            var started = null;
            var step = function (now) {
                if (started === null) started = now;
                var progress = Math.min((now - started) / 1000, 1);
                el.textContent = String(Math.floor(progress * target));
                if (progress < 1) requestAnimationFrame(step); else el.textContent = String(target);
            };
            requestAnimationFrame(step);
        };
        if ("IntersectionObserver" in window) {
            var io = new IntersectionObserver(function (entries, obs) {
                entries.forEach(function (en) { if (en.isIntersecting) { runCounter(en.target); obs.unobserve(en.target); } });
            }, { threshold: 0.4 });
            counters.forEach(function (c) { c.dataset.target = c.textContent.trim(); io.observe(c); });
        } else counters.forEach(runCounter);
    }

    /* Lightbox — replaces magnific-popup. Arrows and the keyboard step through
       the set; focus is trapped and restored. */
    var popupLinks = Array.prototype.slice.call(document.querySelectorAll("[data-image-popup], [data-lightbox], [data-fancybox]")); /* the port keeps v1's own lightbox attribute (lightbox.js data-lightbox, fancybox) — sojournion */
    if (popupLinks.length) {
        var box = document.createElement("div");
        box.className = "tv-lightbox";
        box.setAttribute("role", "dialog");
        box.setAttribute("aria-modal", "true");
        box.setAttribute("aria-label", "Image viewer");
        box.innerHTML =
            '<button type="button" class="tv-lb-close" aria-label="Close">&times;</button>' +
            '<button type="button" class="tv-lb-prev" aria-label="Previous image">&#10094;</button>' +
            '<img alt="">' +
            '<button type="button" class="tv-lb-next" aria-label="Next image">&#10095;</button>';
        document.body.appendChild(box);
        var lbImg = box.querySelector("img"), current = 0, lastFocus = null;
        var show = function (i) {
            current = (i + popupLinks.length) % popupLinks.length;
            var link = popupLinks[current];
            lbImg.src = link.getAttribute("href");
            var inner = link.querySelector("img");
            lbImg.alt = (inner && inner.getAttribute("alt")) || "Gallery image";
        };
        var open = function (i) {
            lastFocus = document.activeElement; show(i);
            box.classList.add("is-open"); document.body.style.overflow = "hidden";
            box.querySelector(".tv-lb-close").focus();
        };
        var close = function () {
            box.classList.remove("is-open"); document.body.style.overflow = "";
            lbImg.removeAttribute("src"); if (lastFocus) lastFocus.focus();
        };
        /* ONE delegated listener: the carousel runs after this and clones its slides with cloneNode, which drops per-link
           listeners — a tap on a looped (cloned) gallery slide opened nothing (barbeard's works carousel). A clone maps back
           to its original by href, so the arrows still step through the real set only. */
        document.addEventListener("click", function (e) {
            var link = e.target.closest && e.target.closest("[data-image-popup], [data-lightbox], [data-fancybox]");
            if (!link) return;
            var i = popupLinks.indexOf(link), href = link.getAttribute("href");
            if (i < 0) for (var k = 0; k < popupLinks.length; k++) if (popupLinks[k].getAttribute("href") === href) { i = k; break; }
            if (i < 0) return;
            e.preventDefault(); open(i);
        });
        box.querySelector(".tv-lb-close").addEventListener("click", close);
        box.querySelector(".tv-lb-prev").addEventListener("click", function () { show(current - 1); });
        box.querySelector(".tv-lb-next").addEventListener("click", function () { show(current + 1); });
        box.addEventListener("click", function (e) { if (e.target === box) close(); });
        document.addEventListener("keydown", function (e) {
            if (!box.classList.contains("is-open")) return;
            if (e.key === "Escape") close();
            if (e.key === "ArrowLeft") show(current - 1);
            if (e.key === "ArrowRight") show(current + 1);
        });
    }

    /* A static template posts nowhere, so rather than pretend, validate and
       say so plainly. */
    var form = document.querySelector("form.tv-contact-form"); /* form. — a template's own wrapper <div class="tv-contact-form"> (cunsultix contact.html) is not a form */
    if (form) {
        form.addEventListener("submit", function (e) {
            e.preventDefault();
            if (!form.checkValidity()) { form.classList.add("was-validated"); return; }
            var note = form.querySelector(".tv-form-note");
            if (note) { note.hidden = false; note.focus(); }
            form.reset(); form.classList.remove("was-validated");
        });
    }
})();

/* Back to top (the shell's #back-to-top): shown past 100px, smooth scroll up. */
(function () {
    var toTop = document.getElementById("back-to-top");
    if (!toTop) return;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var toggle = function () { toTop.classList.toggle("is-visible", window.scrollY > 100); };
    toggle(); window.addEventListener("scroll", toggle, { passive: true });
    toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });
})();

/* Footer year */
(function () { var y = document.getElementById("tv-year"); if (y) y.textContent = String(new Date().getFullYear()); })();

/* No transitions on first paint, and no :hover-driven menus until the visitor moves: a browser can paint the new page with the cursor
   already resting on a nav item, so a hover-opened mega menu or cart panel shows for a moment and then animates shut
   (wrap-d-style, owner note 16). tv-preload drops transitions; tv-nohover keeps hover menus closed until the first real input. */
(function () {
    var body = document.body; body.classList.add("tv-nohover");
    var go = function () { requestAnimationFrame(function () { body.classList.remove("tv-preload"); }); };
    if (document.readyState === "complete") go(); else window.addEventListener("load", go);
    var release = function () { body.classList.remove("tv-nohover"); ["mousemove", "touchstart", "keydown", "wheel"].forEach(function (t) { window.removeEventListener(t, release); }); };
    ["mousemove", "touchstart", "keydown", "wheel"].forEach(function (t) { window.addEventListener(t, release, { passive: true }); });
})();

/* RV-DESIGN START */
/* Rovan 2.0 design behaviours ("Edit Suite"). Every one keys on a data-attribute or class, so it works with a band
   missing, repeated or added later. */
(function () {
    "use strict";
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.classList.add("rv-js");
    var pad2 = function (n) { return (n < 10 ? "0" : "") + n; };
    /* seconds -> 00:MM:SS:FF at 25 frames */
    var timecode = function (s) { var f = Math.floor((s % 1) * 25); s = Math.floor(s); return "00:" + pad2(Math.floor(s / 60) % 60) + ":" + pad2(s % 60) + ":" + pad2(f); };

    /* Band photos (style="--photo:url(images/x)"): a url() inside a custom property resolves against the stylesheet that
       uses it (css/), so make it absolute, then let the CSS paint it (.has-photo) */
    document.querySelectorAll("[style*='--photo']").forEach(function (el) {
        var m = /--photo:\s*url\((['"]?)([^'")]+)\1\)/.exec(el.getAttribute("style") || "");
        if (!m) return;
        el.style.setProperty("--photo", 'url("' + new URL(m[2], document.baseURI).href + '")');
        el.classList.add("has-photo");
    });

    /* Header: shadow once scrolled, the progress line along its foot, and the scroll timecode (the page as a 3-minute reel) */
    var head = document.querySelector("[data-rv-head]");
    var tcs = document.querySelectorAll("[data-rv-timecode]");
    var ticking = false;
    var onScroll = function () {
        ticking = false;
        var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight), p = Math.min(1, Math.max(0, window.scrollY / max));
        if (head) { head.classList.toggle("is-scrolled", window.scrollY > 10); head.style.setProperty("--rv-p", p.toFixed(4)); }
        tcs.forEach(function (t) { t.textContent = timecode(p * 180); });
    };
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    /* Menu button (below 1200px) */
    document.querySelectorAll("[data-rv-burger]").forEach(function (btn) {
        var nav = document.getElementById(btn.getAttribute("aria-controls"));
        if (!nav) return;
        var set = function (open) {
            nav.classList.toggle("is-shown", open); btn.setAttribute("aria-expanded", open ? "true" : "false");
            btn.setAttribute("aria-label", open ? "Close the menu" : "Open the menu");
            document.body.style.overflow = open ? "hidden" : "";
        };
        btn.addEventListener("click", function () { set(!nav.classList.contains("is-shown")); });
        document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("is-shown")) { set(false); btn.focus(); } });
        nav.addEventListener("click", function (e) { if (e.target.closest("a[href]")) set(false); });
        window.addEventListener("resize", function () { if (window.innerWidth >= 1200 && nav.classList.contains("is-shown")) set(false); });
    });

    /* Smooth scroll to a section (v1: ".navbar a, footer a[href='#myPage']" animated the page to the target) */
    document.addEventListener("click", function (e) {
        var a = e.target.closest && e.target.closest(".rv-nav a[href^='#'], footer a[href='#myPage'], .rv-site a[href^='#']:not([data-bs-toggle]):not([data-bs-slide])");
        if (!a) return;
        var id = a.getAttribute("href").slice(1);
        if (!id) return;
        var target = id === "myPage" ? document.body : document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        var y = id === "myPage" ? 0 : target.getBoundingClientRect().top + window.scrollY - (head ? head.offsetHeight : 0) + 1;
        window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
        if (history.replaceState) history.replaceState(null, "", "#" + id);
    });

    /* Scrollspy (v1's data-spy="scroll"): the track whose band is under the header lights up */
    document.querySelectorAll("[data-rv-spy]").forEach(function (list) {
        var links = Array.prototype.slice.call(list.querySelectorAll("a[href^='#']"));
        var bands = links.map(function (a) { var id = a.getAttribute("href").slice(1); return id === "myPage" ? document.querySelector("main > section") : document.getElementById(id); });
        if (!bands.some(Boolean)) return;
        var mark = function () {
            var line = (head ? head.offsetHeight : 0) + window.innerHeight * 0.3, cur = 0;
            bands.forEach(function (b, i) { if (b && b.getBoundingClientRect().top <= line) cur = i; });
            if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) cur = links.length - 1;
            links.forEach(function (a, i) { var li = a.closest("li"); if (li) li.classList.toggle("active", i === cur); });
        };
        window.addEventListener("scroll", function () { requestAnimationFrame(mark); }, { passive: true });
        mark();
    });

    /* Timeline reel: the playhead runs across the tracks; the clip under it plays in the monitor. Clicking a clip jumps there. */
    document.querySelectorAll("[data-rv-reel]").forEach(function (reel) {
        var head2 = reel.querySelector("[data-rv-playhead]"), tracks = reel.querySelector(".rv-tracks");
        var clock = reel.querySelector("[data-rv-clock]"), label = reel.querySelector("[data-rv-clipname]");
        var clips = Array.prototype.slice.call(reel.querySelectorAll(".rv-clip[data-key]"));
        var imgs = Array.prototype.slice.call(reel.querySelectorAll(".rv-monitor__img"));
        if (!head2 || !tracks || !clips.length) return;
        var COLS = 24, LOOP = 24; /* seconds for one pass */
        var span = clips.map(function (c) { var at = +c.getAttribute("data-at") || 1, len = +c.getAttribute("data-len") || 3; return { el: c, a: (at - 1) / COLS, b: (at - 1 + len) / COLS }; });
        var live = null, t = 0, last = null, hold = 0;
        var show = function (key, name) {
            if (key === live) return; live = key;
            imgs.forEach(function (im) { im.classList.toggle("is-live", im.getAttribute("data-clip") === key); });
            clips.forEach(function (c) { c.classList.toggle("is-live", c.getAttribute("data-key") === key); });
            if (label) label.textContent = name;
        };
        var place = function () {
            tracks.style.setProperty("--t", t.toFixed(4));
            if (clock) clock.textContent = timecode(t * LOOP);
            var hit = null;
            span.forEach(function (s) { if (t >= s.a && t < s.b && (!hit || s.a > hit.a)) hit = s; });
            if (hit) show(hit.el.getAttribute("data-key"), hit.el.getAttribute("data-title") || hit.el.textContent);
            else show("reel", "Studio reel");
        };
        /* one rAF loop, running only while the hero is on screen and the tab is visible; a clicked clip holds 3.5 s */
        var running = false, onScreen = true;
        var step = function (now) {
            if (!running) return;
            /* a frame gap is capped at 0.1 s: a throttled or paused tab must not jump the playhead across the reel */
            if (last !== null && now > hold) t = (t + Math.min(now - last, 100) / 1000 / LOOP) % 1;
            last = now; place();
            requestAnimationFrame(step);
        };
        var start = function () { if (running || reduce || document.hidden || !onScreen) return; running = true; last = null; requestAnimationFrame(step); };
        var stop = function () { running = false; };
        clips.forEach(function (c) {
            var s = span.filter(function (x) { return x.el === c; })[0];
            var go = function () { t = s.a + 0.002; hold = performance.now() + 3500; place(); };
            c.addEventListener("click", go);
            c.addEventListener("focus", go);
            c.addEventListener("mouseenter", go);
        });
        if ("IntersectionObserver" in window) new IntersectionObserver(function (en) { en.forEach(function (x) { onScreen = x.isIntersecting; if (onScreen) start(); else stop(); }); }).observe(reel);
        document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
        place(); start();
    });

    /* Tally marks: data-rv-tally="7" -> one struck group of five + two */
    document.querySelectorAll("[data-rv-tally]").forEach(function (el) {
        var n = parseInt(el.getAttribute("data-rv-tally"), 10) || 0, html = "";
        for (var g = 0; g < n; g += 5) {
            var k = Math.min(5, n - g);
            html += '<span class="rv-tally__group' + (k === 5 ? " rv-tally__group--five" : "") + '">' + new Array(Math.min(k, 4) + 1).join("<i></i>") + "</span>";
        }
        el.innerHTML = html;
    });

    /* Level meters (v1's progress bars, filled when seen) and pictures that power on */
    var meters = document.querySelectorAll("[data-rv-meter]");
    var lit = function (m) { m.style.setProperty("--v", m.getAttribute("data-rv-meter")); };
    document.querySelectorAll(".rv-card__media img, .rv-viewer__frame img").forEach(function (im) { im.setAttribute("data-rv-seen", ""); });
    var seen = document.querySelectorAll("[data-rv-seen]");
    if ("IntersectionObserver" in window && !reduce) {
        var io = new IntersectionObserver(function (en, obs) {
            en.forEach(function (x) { if (!x.isIntersecting) return; if (x.target.hasAttribute("data-rv-meter")) lit(x.target); else x.target.classList.add("is-seen"); obs.unobserve(x.target); });
        }, { threshold: 0.25 });
        meters.forEach(function (m) { io.observe(m); });
        seen.forEach(function (s) { io.observe(s); });
    } else { meters.forEach(lit); seen.forEach(function (s) { s.classList.add("is-seen"); }); }

    /* Work filter (v1's ALL / brand / design / photo / video pills) */
    document.querySelectorAll("[data-rv-filter]").forEach(function (bar) {
        var band = bar.closest("section") || document;
        var items = band.querySelectorAll("[data-cat]"), empty = band.querySelector("[data-rv-empty]");
        bar.addEventListener("click", function (e) {
            var b = e.target.closest("[data-filter]"); if (!b) return;
            var f = b.getAttribute("data-filter"), shown = 0;
            bar.querySelectorAll("[data-filter]").forEach(function (x) { var on = x === b; x.classList.toggle("is-on", on); x.setAttribute("aria-pressed", on ? "true" : "false"); });
            items.forEach(function (it) { var ok = f === "all" || (" " + it.getAttribute("data-cat") + " ").indexOf(" " + f + " ") > -1; it.classList.toggle("is-hidden", !ok); if (ok) shown++; });
            if (empty) empty.hidden = shown > 0;
        });
    });

    /* Forms: validate, then say plainly it was received (a static template posts nowhere) */
    document.querySelectorAll("form[data-rv-form]").forEach(function (form) {
        var sent = false;
        form.addEventListener("submit", function (e) {
            e.preventDefault();
            if (!form.checkValidity()) { form.classList.add("was-validated"); var bad = form.querySelector(":invalid"); if (bad) bad.focus(); return; }
            var note = form.querySelector(".rv-form-note");
            if (note) { note.hidden = false; note.focus(); }
            var job = form.closest(".rv-job"); if (job) job.classList.add("is-done");
            var state = job && job.querySelector(".rv-job__state"); if (state) state.lastChild.textContent = "Done";
            sent = true; form.reset(); sent = false; form.classList.remove("was-validated");
        });
        /* the Clear button hides the note again; the reset after a send does not */
        form.addEventListener("reset", function () { form.classList.remove("was-validated"); if (sent) return; var note = form.querySelector(".rv-form-note"); if (note) note.hidden = true; });
    });
})();
/* RV-DESIGN END */
