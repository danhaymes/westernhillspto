# westernhillspto.com

Website for the Western Hills Elementary PTO. Plain HTML, CSS and JavaScript with no build step, hosted free on Cloudflare Pages from this GitHub repo.

## Updating content

Almost every update is a change to one file in `data/`. Edit it on GitHub (pencil icon → Commit changes) and the live site updates in about a minute.

| To change… | Edit | Notes |
|---|---|---|
| Events and meetings | `data/events.json` | `date` is `YYYY-MM-DD`, `time` is 24-hour (`18:00`). Leave `date` blank to list it under "Dates coming soon". Past events move to the bottom automatically. |
| Committees, chairs, descriptions | `data/committees.json` | `"chairs": []` shows a "Chair needed" badge and lists it on Get Involved. |
| Executive board | `data/board.json` | |
| Volunteer sign-ups | `data/signups.json` | Add `{ "title": "Fun Run volunteers", "when": "Oct 24", "url": "https://www.signupgenius.com/..." }`. Remove it when it closes. |
| Donate / spirit wear / volunteer form links | `data/site.json` → `links` | Paste a Square payment link into `donate` and the Donate button turns on. A Google Form URL in `volunteerForm` replaces the "Email us" button. |
| PTO documents | `data/resources.json` | Put PDFs in `files/` and set `"url": "files/bylaws.pdf"`, or paste a Google Drive share link. |

JSON is picky: every item except the last in a list needs a comma after it, and text goes in double quotes. If a section shows "could not load", paste the file into jsonlint.com to find the typo.

## Deploying (one time)

1. Create a GitHub repo (for example `westernhillspto-site`) and upload everything in this folder to it.
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**, then pick the repo.
3. Build settings: Framework preset **None**, build command **blank**, build output directory **`/`**. Save and deploy.
4. In the new Pages project: **Custom domains → Set up a custom domain** → `westernhillspto.com`, then add `www.westernhillspto.com` too. Because the domain is already on Cloudflare, DNS records are created for you.

## Previewing locally

The pages load their content with `fetch`, so open them through a small web server rather than double-clicking the file:

```
python3 -m http.server 8000
```

then visit http://localhost:8000.

## Brand rules followed

From the WDMCS Brand Guide (Activities system):

- Colors: WDMCS Orange `#FF6720`, black, white and the grayscale tints only.
- Fonts: Roboto (headlines) and Source Sans (body), both on the approved list and free on Google Fonts.
- Logos are used unaltered: the PTO logo, and the full-color Tiger Paw (with its white keyline, approved on any background). Don't recolor, stretch or combine them.
- Orange text is only used on black. On white, orange is used for fills and accents, because orange text on white is hard to read.

## Later: a login for other editors

All content already lives in `data/`, so a free Git-based editor such as Pages CMS (pagescms.org) or Sveltia CMS can be added on top without changing the site. Editors sign in with GitHub and edit through forms.

## Later: Google Calendar

Once Google for Nonprofits is set up, create a public PTO calendar. Either link to it from the Events page, or keep using `events.json` as the source and import the "Add to my calendar" files into Google Calendar.
