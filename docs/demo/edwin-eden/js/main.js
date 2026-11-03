/*
Template Name: edwin-eden-ux-designer-portfolio-template
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

    /* Back to top — fades in past 100px, returns to the top */
    var toTop = document.getElementById("back-to-top");
    if (toTop) {
        var toggleToTop = function () { toTop.classList.toggle("is-visible", window.scrollY > 100); };
        toggleToTop();
        window.addEventListener("scroll", toggleToTop, { passive: true });
        toTop.addEventListener("click", function (e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
        });
    }

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

/* EE-DESIGN-START — Edwin-Eden design layer: scroll marker, smooth anchors, work filter, forms. Replaced by _design.mjs on every replay. */
(function () {
    "use strict";
    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* a.page-scroll: smooth jump to the section (the fixed header is cleared by scroll-padding in CSS); closes the open menu */
    document.querySelectorAll("a.page-scroll").forEach(function (a) {
        a.addEventListener("click", function (e) {
            var id = a.getAttribute("href");
            if (!id || id.charAt(0) !== "#" || id.length < 2) return;
            var target = document.querySelector(id);
            if (!target) return;
            e.preventDefault();
            target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
            if (history.replaceState) history.replaceState(null, "", id);
        });
    });

    /* the ruler marker: the nav item of the section in view carries .active (and aria-current) */
    var navLinks = Array.prototype.slice.call(document.querySelectorAll(".ee-nav .navbar-nav a[href^='#']"));
    var spy = navLinks.map(function (a) { return { a: a, s: document.querySelector(a.getAttribute("href")) }; }).filter(function (x) { return x.s; });
    var onScroll = function () {
        var y = window.scrollY + 120, cur = spy[0];
        spy.forEach(function (x) { if (x.s.offsetTop <= y) cur = x; });
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = spy[spy.length - 1];
        spy.forEach(function (x) {
            var on = x === cur, li = x.a.closest("li");
            if (li) li.classList.toggle("active", on);
            if (on) x.a.setAttribute("aria-current", "true"); else x.a.removeAttribute("aria-current");
        });
    };
    if (spy.length) { onScroll(); window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("resize", onScroll); }

    /* work filter: instant, on the page, never a reload (.filter-options buttons, data-groups on items) */
    document.querySelectorAll("[data-ee-filter]").forEach(function (bar) {
        var grid = document.querySelector("#grid") || bar.nextElementSibling;
        if (!grid) return;
        var items = Array.prototype.slice.call(grid.querySelectorAll("[data-groups]"));
        var apply = function (group) {
            var shown = [];
            items.forEach(function (it) {
                var groups = []; try { groups = JSON.parse(it.getAttribute("data-groups")) || []; } catch (err) { groups = []; }
                var on = group === "all" || groups.indexOf(group) > -1;
                it.hidden = !on; it.classList.remove("ee-lone");
                if (on) shown.push(it);
            });
            if (shown.length % 2 === 1) shown[shown.length - 1].classList.add("ee-lone");
        };
        bar.addEventListener("click", function (e) {
            var b = e.target.closest("button[data-group]"); if (!b) return;
            bar.querySelectorAll("button").forEach(function (x) { var on = x === b; x.classList.toggle("active", on); x.setAttribute("aria-pressed", on ? "true" : "false"); });
            apply(b.getAttribute("data-group"));
        });
        apply("all");
    });

    /* forms: check, then say plainly that a static demo posts nowhere (each form's own .tv-form-note) */
    document.querySelectorAll("form[data-ee-form]").forEach(function (f) {
        f.addEventListener("submit", function (e) {
            e.preventDefault();
            if (!f.checkValidity()) { f.classList.add("was-validated"); var bad = f.querySelector(":invalid"); if (bad) bad.focus(); return; }
            f.reset(); f.classList.remove("was-validated");
            var note = f.querySelector(".tv-form-note");
            if (note) { note.hidden = false; note.focus(); }
        });
        f.addEventListener("reset", function () { f.classList.remove("was-validated"); var n = f.querySelector(".tv-form-note"); if (n) n.hidden = true; });
    });
})();
/* EE-DESIGN-END */
