/* Western Hills Elementary PTO — site script.
   All content lives in /data/*.json. This file only reads it and draws the page. */
(function () {
  "use strict";

  var CATEGORY_LABELS = {
    meeting: "PTO Meeting", family: "Family Event", fundraiser: "Fundraiser",
    students: "For Students", staff: "Staff Support"
  };
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var LONG_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var LONG_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  var cache = {};
  function load(name) {
    if (!cache[name]) {
      cache[name] = fetch("data/" + name + ".json", { cache: "no-cache" }).then(function (r) {
        if (!r.ok) throw new Error(name + ".json returned " + r.status);
        return r.json();
      });
    }
    return cache[name];
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ---------- dates ---------- */
  function parseDate(s) {
    if (!s) return null;
    var p = s.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function today() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function fmtTime(t) {
    if (!t) return "";
    var p = t.split(":").map(Number), h = p[0], m = p[1] || 0;
    var ap = h >= 12 ? "PM" : "AM", h12 = h % 12 || 12;
    return h12 + ":" + (m < 10 ? "0" : "") + m + " " + ap;
  }
  function longDate(d) { return LONG_DAYS[d.getDay()] + ", " + LONG_MONTHS[d.getMonth()] + " " + d.getDate(); }

  function splitEvents(list) {
    var t = today(), upcoming = [], past = [], soon = [];
    list.forEach(function (e) {
      var d = parseDate(e.date);
      if (!d) { soon.push(e); return; }
      e._d = d;
      (d >= t ? upcoming : past).push(e);
    });
    upcoming.sort(function (a, b) { return a._d - b._d || (a.time || "").localeCompare(b.time || ""); });
    past.sort(function (a, b) { return b._d - a._d; });
    return { upcoming: upcoming, past: past, soon: soon };
  }

  /* ---------- calendar file (.ics) ---------- */
  function icsStamp(d, t) {
    var p = (t || "00:00").split(":");
    function z(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()) + "T" + z(+p[0]) + z(+p[1] || 0) + "00";
  }
  function icsText(s) { return String(s || "").replace(/\\/g, "\\\\").replace(/[,;]/g, "\\$&").replace(/\n/g, "\\n"); }
  function downloadIcs(e) {
    var d = e._d, lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Western Hills Elementary PTO//EN", "BEGIN:VEVENT",
      "UID:" + e.date + "-" + e.title.replace(/\W+/g, "-").toLowerCase() + "@westernhillspto.com",
      "DTSTAMP:" + icsStamp(new Date(), new Date().toTimeString().slice(0, 5))];
    if (e.time) {
      lines.push("DTSTART;TZID=America/Chicago:" + icsStamp(d, e.time));
      lines.push("DTEND;TZID=America/Chicago:" + icsStamp(d, e.endTime || e.time));
    } else {
      var n = new Date(d); n.setDate(n.getDate() + 1);
      lines.push("DTSTART;VALUE=DATE:" + icsStamp(d).slice(0, 8));
      lines.push("DTEND;VALUE=DATE:" + icsStamp(n).slice(0, 8));
    }
    lines.push("SUMMARY:" + icsText(e.title), "LOCATION:" + icsText(e.location), "DESCRIPTION:" + icsText(e.description), "END:VEVENT", "END:VCALENDAR");
    var blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = e.title.replace(/[^\w]+/g, "-") + "-" + e.date + ".ics";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  /* ---------- event markup ---------- */
  function eventHtml(e, i, opts) {
    opts = opts || {};
    var d = e._d, meta = [];
    meta.push(longDate(d));
    if (e.time) meta.push(fmtTime(e.time) + (e.endTime ? " – " + fmtTime(e.endTime) : ""));
    if (e.location) meta.push(e.location);
    var actions = "";
    if (!opts.past) {
      actions = '<div class="event-actions"><button class="linkbtn" type="button" data-ics="' + i + '">Add to my calendar</button>' +
        (e.link ? '<a href="' + esc(e.link) + '" target="_blank" rel="noopener">Details &amp; sign-up</a>' : "") + "</div>";
    }
    return '<article class="event' + (opts.past ? " past" : "") + '" data-cat="' + esc(e.category) + '">' +
      '<div class="stamp" aria-hidden="true"><span class="m">' + MONTHS[d.getMonth()] + '</span><span class="d">' + d.getDate() +
      '</span><span class="w">' + DAYS[d.getDay()] + "</span></div>" +
      '<div class="event-body"><div><span class="tag ' + esc(e.category) + '">' + esc(CATEGORY_LABELS[e.category] || "Event") + "</span></div>" +
      "<h3>" + esc(e.title) + '</h3><div class="event-meta">' + meta.map(function (m) { return "<span>" + esc(m) + "</span>"; }).join("") + "</div>" +
      (e.description ? "<p>" + esc(e.description) + "</p>" : "") + actions + "</div></article>";
  }
  function soonHtml(e) {
    return '<div class="soon"><span class="tag ' + esc(e.category) + '">' + esc(CATEGORY_LABELS[e.category] || "Event") +
      "</span><h3>" + esc(e.title) + "</h3>" + (e.description ? "<p>" + esc(e.description) + "</p>" : "") + "</div>";
  }
  function bindIcs(root, list) {
    $all("[data-ics]", root).forEach(function (b) {
      b.addEventListener("click", function () { downloadIcs(list[+b.getAttribute("data-ics")]); });
    });
  }
  function nextMeeting(list) {
    return splitEvents(list).upcoming.filter(function (e) { return e.category === "meeting"; })[0];
  }

  /* ---------- shared: header, site links, copy ---------- */
  function initChrome() {
    var btn = $(".nav-toggle"), nav = $("#site-nav");
    if (btn && nav) {
      btn.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }
    var y = $("#year"); if (y) y.textContent = new Date().getFullYear();
    document.addEventListener("click", function (ev) {
      var b = ev.target.closest && ev.target.closest(".copybtn");
      if (!b) return;
      var text = b.getAttribute("data-copy");
      var done = function () { var o = b.textContent; b.textContent = "Copied"; setTimeout(function () { b.textContent = o; }, 1500); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { selectNear(b); });
      } else { selectNear(b); }
    });
  }
  function selectNear(b) {
    var code = b.parentNode.querySelector("code"); if (!code) return;
    var r = document.createRange(); r.selectNodeContents(code);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }

  function applySite(site) {
    $all("[data-site-email]").forEach(function (el) {
      if (el.tagName === "A") el.href = "mailto:" + site.email + (el.getAttribute("data-subject") ? "?subject=" + encodeURIComponent(el.getAttribute("data-subject")) : "");
      if (el.hasAttribute("data-show-text")) el.textContent = site.email;
    });
    $all("[data-copy-email]").forEach(function (el) { el.setAttribute("data-copy", site.email); });
    $all("[data-site-facebook]").forEach(function (el) { el.href = site.facebook; });
    $all("[data-site-school]").forEach(function (el) { el.href = site.school.website; });
    $all("[data-site-district]").forEach(function (el) { el.href = site.school.districtWebsite; });
    $all("[data-site-donate]").forEach(function (el) {
      if (site.links && site.links.donate) { el.href = site.links.donate; } else { el.hidden = true; }
    });
    $all("[data-site-address]").forEach(function (el) { el.textContent = site.school.address; });
  }

  /* ---------- pages ---------- */
  var pages = {
    home: function () {
      load("events").then(function (data) {
        var s = splitEvents(data.events), up = s.upcoming.slice(0, 3);
        var box = $("#next-events");
        box.innerHTML = up.length ? up.map(function (e, i) { return eventHtml(e, i); }).join("") :
          '<p class="empty">No dated events right now. Check back soon or follow us on Facebook.</p>';
        bindIcs(box, up);
        $("#year-list").innerHTML = s.soon.map(soonHtml).join("");
      }).catch(showError("#next-events"));
    },

    events: function () {
      load("events").then(function (data) {
        var s = splitEvents(data.events);
        var up = $("#upcoming");
        up.innerHTML = s.upcoming.length ? s.upcoming.map(function (e, i) { return eventHtml(e, i); }).join("") :
          '<p class="empty">Nothing on the calendar yet. Dates will appear here as they are set.</p>';
        bindIcs(up, s.upcoming);
        $("#soon").innerHTML = s.soon.length ? s.soon.map(soonHtml).join("") : '<p class="empty">Every event has a date.</p>';
        var past = $("#past"), pastWrap = $("#past-wrap");
        if (s.past.length) { past.innerHTML = s.past.map(function (e, i) { return eventHtml(e, i, { past: true }); }).join(""); }
        else { pastWrap.hidden = true; }

        $all(".chip").forEach(function (chip) {
          chip.addEventListener("click", function () {
            $all(".chip").forEach(function (c) { c.setAttribute("aria-pressed", c === chip ? "true" : "false"); });
            var f = chip.getAttribute("data-filter");
            $all("#upcoming .event").forEach(function (ev) { ev.hidden = f !== "all" && ev.getAttribute("data-cat") !== f; });
          });
        });
      }).catch(showError("#upcoming"));
    },

    committees: function () {
      load("committees").then(function (data) {
        $("#jump").innerHTML = data.categories.map(function (c) {
          return '<a class="chip" href="#' + c.id + '">' + esc(c.name) + "</a>";
        }).join("");
        $("#committee-list").innerHTML = data.categories.map(function (c) {
          var items = data.committees.filter(function (m) { return m.category === c.id; });
          return '<section class="cat" id="' + c.id + '"><div class="cat-head"><h2>' + esc(c.name) + "</h2><p>" + esc(c.blurb) + "</p></div>" +
            '<div class="grid grid-3">' + items.map(committeeHtml).join("") + "</div></section>";
        }).join("");
      }).catch(showError("#committee-list"));
    },

    involved: function () {
      Promise.all([load("site"), load("signups"), load("committees"), load("events")]).then(function (r) {
        var site = r[0], sign = r[1].signups, comm = r[2].committees, ev = r[3].events;

        $("#signups").innerHTML = sign.length ? '<ul class="signup-list">' + sign.map(function (s) {
          return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener"><span>' + esc(s.title) + "</span><span>" + esc(s.when || "Sign up") + " →</span></a></li>";
        }).join("") + "</ul>" : '<p class="empty">No open sign-ups right now. New ones are posted here and on Facebook.</p>';

        var open = comm.filter(function (c) { return !c.chairs.length; });
        $("#open-chairs").innerHTML = open.length ? open.map(function (c) {
          return '<li><strong>' + esc(c.name) + "</strong> — " + esc(c.description) + "</li>";
        }).join("") : "<li>Every committee has a chair right now. Committees always welcome extra helpers.</li>";

        var m = nextMeeting(ev);
        $("#meeting-when").textContent = m ? longDate(m._d) + " at " + fmtTime(m.time) : "The next date will be posted soon.";

        var vol = $("#volunteer-btn");
        if (site.links.volunteerForm) { vol.href = site.links.volunteerForm; vol.target = "_blank"; vol.rel = "noopener"; vol.textContent = "Fill out the volunteer form"; }

        var don = $("#donate-btn"), donNote = $("#donate-note");
        if (site.links.donate) { don.href = site.links.donate; don.removeAttribute("aria-disabled"); donNote.hidden = true; }

        var sw = $("#spirit-btn");
        $("#spirit-msg").textContent = site.spiritWear.message;
        if (site.links.spiritWear) { sw.href = site.links.spiritWear; sw.hidden = false; }
      }).catch(showError("#signups"));
    },

    about: function () {
      Promise.all([load("board"), load("events")]).then(function (r) {
        $("#board").innerHTML = r[0].board.map(function (b) {
          return '<div class="seat"><span class="role">' + esc(b.role) + '</span><span class="names">' + b.names.map(esc).join("<br>") + "</span></div>";
        }).join("");
        var meetings = splitEvents(r[1].events);
        var all = meetings.upcoming.concat(meetings.past).filter(function (e) { return e.category === "meeting"; })
          .sort(function (a, b) { return a._d - b._d; });
        var t = today();
        $("#meeting-dates").innerHTML = all.map(function (e) {
          var done = e._d < t;
          return "<li" + (done ? ' class="empty"' : "") + ">" + esc(longDate(e._d)) + (done ? " (held)" : "") + "</li>";
        }).join("");
      }).catch(showError("#board"));
    },

    resources: function () {
      load("resources").then(function (data) {
        $("#docs").innerHTML = data.documents.map(function (d) {
          var right = d.url ? '<a class="btn btn-ink" href="' + esc(d.url) + '" target="_blank" rel="noopener">Open</a>' : '<span class="tag draft">Coming soon</span>';
          return '<div class="doc"><div><div class="kind">' + esc(d.kind) + "</div><h3>" + esc(d.title) + "</h3></div>" + right + "</div>";
        }).join("");
      }).catch(showError("#docs"));
    }
  };

  function committeeHtml(c) {
    var open = !c.chairs.length;
    return '<article class="panel committee' + (open ? " open" : "") + '"><h3>' + esc(c.name) +
      (open ? ' <span class="tag need">Chair needed</span>' : "") + "</h3><p>" + esc(c.description) + "</p>" +
      '<div class="chairs"><strong>' + (open ? "Interested?" : c.chairs.length > 1 ? "Chairs" : "Chair") + "</strong>" +
      (open ? '<a href="get-involved.html">Find out how to help</a>' : c.chairs.map(esc).join(", ")) + "</div></article>";
  }

  function showError(sel) {
    return function (err) {
      var el = $(sel);
      if (el) el.innerHTML = '<p class="empty">This section could not load. Refresh the page, or email us if it keeps happening.</p>';
      if (window.console) console.error(err);
    };
  }

  document.addEventListener("DOMContentLoaded", function () {
    initChrome();
    load("site").then(applySite).catch(function (e) { console.error(e); });
    var p = document.body.getAttribute("data-page");
    if (pages[p]) pages[p]();
  });
})();
