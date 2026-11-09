# Ease Consultancy website – maintenance notes

Last project maintenance pass: 09 November 2026

## Included in this package
- 100 HTML pages in the supplied ZIP, including the new `career.html` and `consultation-availability.html` pages.
- `heading-search-index.js` contains H1, H2 and H3 heading records only. The homepage search matches the `heading` field, not paragraph text.
- The feedback survey is scheduled approximately five minutes after the first page visit in a browser tab/session. It can be dismissed and is shown once per session.
- Feedback, career-interest and consultation-request forms use the same Formspree endpoint already used by the site's existing contact form: `https://formspree.io/f/mdenravb`.
- Consultation requests capture a preferred date/time window in IST. A request is not a confirmed appointment; the team must confirm availability manually.
- Shared vintage-inspired colour/typography treatment, common navigation links, FAQs and contact shortcuts are applied across the pages.

## Important content notes
- The Income-tax Act, 2025 came into force on 1 April 2026. Income for FY 2025-26 is still handled for AY 2026-27 under the Income-tax Act, 1961; income from 1 April 2026 onward is under the new Act and Tax Year terminology. Check the official transition FAQs for each case.
- GSTN advisories dated 1 November 2026 cover registration and related portal workflows. Confirm applicability from the official GST portal before filing.
- Homepage regulatory headlines are linked to official government/regulator sources. Always read the full notification or circular and verify its current applicability.
- The project contains 100 HTML pages after adding the two new pages. The uploaded ZIP itself contained 98 HTML pages, not 200. Pages not included in the supplied archive cannot be indexed or updated by this build.

## Before publishing
1. Keep `heading-search-index.js` in the same folder as `index.html` and the other root-level HTML files.
2. Keep all original filenames and the root-level folder structure unchanged.
3. Confirm the Formspree account receives a test contact enquiry, career form, consultation request and survey submission.
4. Supply the actual office working hours if you want fixed hours displayed. The consultation page currently collects preferred time windows without claiming live availability.
5. Test the survey in a private browser session; wait five minutes or temporarily shorten the timer in `ease-feedback-survey` during local testing.
6. For each new HTML page, rebuild `heading-search-index.js` so its headings appear in homepage search.


## Release: 09 November 2026 — layout, themes, feedback and regulatory updates

- Standardised the desktop navigation sizing and introduced a responsive collapse point at 1400px to prevent horizontal overflow at 100% zoom.
- Kept navigation labels on one line on desktop; the universal heading search remains in the navigation list and appears inside the mobile menu.
- Added a third persistent theme, Midnight, to the existing Vintage/Light and Dark themes. The theme control cycles Light → Dark → Midnight → Light using the shared `easeTheme` key.
- Added complete styling for the five-minute feedback survey overlay, form controls, close/dismiss actions and status text.
- Hardened the CTA banner link styling and supplied a visible fallback label if its anchor is empty.
- Added `updates.html` with selected Business & Compliance Updates as of 09 November 2026 and links to official RBI, CBIC, GST and Income Tax portals.
- Added Business Updates to the common navigation across all 101 HTML pages.
- Rebuilt `heading-search-index.js` with 1,348 H1/H2/H3 heading records across 101 pages.
- Static QA: 101/101 pages contain the shared search, contact toggle, feedback modal and three-theme controller; zero broken local links; zero duplicate IDs; all inline JavaScript passed Node v22 syntax validation; ZIP integrity verified.
- Deployment: upload the complete contents of `Ease-Consultancy-main` to the website root, preserving filenames and folder structure. Ensure `heading-search-index.js` is deployed beside the HTML pages. Hard refresh with Ctrl+F5 after deployment.
- Browser QA note: external browser automation was restricted in the build environment, so responsive behaviour should also be checked once deployed on the target hosting domain and browsers.
