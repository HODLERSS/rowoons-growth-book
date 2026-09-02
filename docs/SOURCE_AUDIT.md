# Source audit — 2026-09-02

`node scripts/qa/sources.mjs` opens every URL the content cites in a real browser (cdc.gov and zerotothree.org
refuse plain HTTP clients), stores the page text under `qa/source-cache/`, and writes `qa/source-audit.json`.
Re-run it with `--refresh` to refetch; the "Sources checked" date shown in every source card is
`CONTENT_REVIEWED` in `src/lib/constants.ts` and must be bumped by hand after a run.

## What the first run found

| Check | Result |
|---|---|
| Items with a source (milestones, play tips, watch-outs) | 461 |
| Distinct cited pages | 19 (21 after the fixes below) |
| Pages reachable (HTTP 200, real content) | 19 of 19 |
| `sourceQuote` texts found verbatim on the cited page | **0 of 461** |
| CDC-cited milestones sitting on a page that no longer lists them, or lists them at another age | 32 |

The "quotes" were paraphrases written in the source's voice. The app displayed them inside quotation marks, so a
parent who opened the source would not find the sentence. CDC also rewrote its checklists in 2022 ("what most
children do by", 75th percentile): several milestones cited a CDC age page that now carries them at a later
age (name response 6 → 9 months, "understands no" 9 → 12, first steps 12 → 15, "shy with strangers" 12 → 9)
or dropped them altogether (copies facial expressions, babbles with expression, has favorite toys, tantrums).

## What changed

1. **Relabelled, not quoted.** The field is now `sourceSummary` in all six content files and in `SourceInfo`.
   The source card shows it under "In short, the source says" / "출처 내용 요약", never inside quotation marks.
   `scripts/qa/content_check.py` requires it on every item.
2. **32 milestone corrections** (`scripts/qa/fix_citations_20260902.py`, applied to EN and KO together):
   - re-cited to the CDC page that lists the milestone, with a summary that says what that page says and, where
     the book places the milestone earlier than CDC, a sentence in the description saying so ("CDC lists this as
     something most babies do by 9 months");
   - re-cited month-1 and month-3 items to AAP's "Developmental Milestones at 1 Month" / "1–4 Months" pages,
     which do list them (turning toward familiar voices, strong reflex movements, eyes following moving objects,
     opening the hands);
   - replaced six milestones that no current checklist carries with the CDC item for that age: chuckles when
     you make them laugh, works to keep your attention, makes sounds back when you talk, pushes up on elbows
     (month 4); shows several facial expressions (month 8); reacts when you leave (month 9); plays games with
     you like pat-a-cake (month 12); and "tries to say 1 or 2 new words" at 15 months (CDC's 3+ words is the
     18-month item, which the book already has);
   - tantrums (month 18) now cite AAP's tantrum guidance, which states the 1–3-year range.
3. **Every source card shows the audit date** ("Sources checked 2 Sep 2026").

## Still open

- Play tips and watch-outs cite topic overview pages (Zero to Three age-based tips, NAEYC play, CPSC
  "Kids and Babies", AAP safety index). The summaries describe those pages fairly, but a per-item claim such as
  "by 5 months" is the book's, not the page's. A second pass could cite the specific article per item.
- 14 milestones cite the CDC milestones index page rather than an age page.
- The audit checks reachability and verbatim text only. Age placement was judged by reading the CDC/AAP
  checklists; the fuzzy `best` match in the JSON is a hint for that reading, not a verdict.
