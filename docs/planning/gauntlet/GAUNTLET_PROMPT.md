# Gauntlet: question every unsure part of the WRT restoration history app

## Your job

You are a careful outsider walking through a new web app built from WRT's (Whakatipu Reforestation Trust) planting spreadsheets, Autumn 2015 to Autumn 2026. You did not build it. Go through every page and ask: why is this here, and is it right?

Above all, find the parts that are unsure and turn each one into one clear question that WRT staff can answer. Unsure parts are shown in amber, or marked "Needs review", "Name needs a ruling", "Order scheme, not a place", "WRT ruling" or "To confirm".

You fix nothing. You change no files except the ones listed under "Output".

## Before you start

1. The app is in `~/wtr-app-tree-reforestation`. If http://localhost:3000 does not load, open Terminal in that folder, run `npm run dev`, and wait for "Ready".
2. Click through it in a browser. If your computer-use tool can only look at the browser, not click in it, use the browser tools (Claude in Chrome or the built-in browser) to move around.
3. Read http://localhost:3000/about-the-data first. It explains "recorded plants", the amber split and the check against the workbook totals. Don't ask anything that page already answers, unless its answer is itself unclear.

## The rule: justify the question before you ask it

Anyone reading these questions will think: "Surely they tracked that? Just look it up." So before every question, say in one or two sentences why it cannot be looked up. It is almost always one of these:

- **It was never recorded.** The history holds only site, species, season and a count. There are no planting dates, delivery dockets, event types, volunteer numbers, photos or map locations.
- **It was recorded as a plan, not an outcome.** The history was retyped from allocation sheets. It says what was meant to go out, not what went into the ground.
- **It was recorded twice, differently.** Two places disagree (a site number in the history against the site register; four different grand totals in one workbook) and nothing says which is right.
- **It was typed by hand with no fixed list.** One species under two names, one site under a dozen spellings, a cell that says "TBC".
- **It is a decision, not a fact.** For example, whether an order scheme counts as a site.

If none of these applies, the answer can be found in the app or the data. Then it is not a question for WRT. Find the answer yourself and put it in ANSWERED.md.

## The walk, in this order

1. **Overview** (`/`).
2. **Sites** (`/sites`). Open at least Slope Hill, Whitechapel, Lake Hayes, Jardine Park, Arrowtown and Bush Creek, Tucker Beach and Shotover River, Paper4Trees, and two small sites.
3. **Species** (`/species`). Use the "Name needs a ruling" filter and open every species it shows. Also open Mānuka, Kohukohu, Tī kōuka and Weinmania racemosa.
4. **Seasons** (`/seasons`). Look at every season. Open Autumn 2020, Autumn 2024, Spring 2024, Spring 2025 and Autumn 2026.
5. **Records** (`/records`). Set Review status to "Needs review". Then pick each option in "Review question" in turn. For each, open the Source panel on at least three rows and read the "WRT ruling" and "To confirm" lines.
6. **About the data**, once more, now you have seen everything.

On every page, ask of each block: why is this here, what does it answer, and would a WRT volunteer understand it? Note anything confusing, even if it is about the app rather than the data.

## You must cover these

Find each one in the app yourself. This list tells you where to look, not what the answer is.

- **Recorded or planted:** was the history updated from what was planted, or from the allocation sheet?
- **Slope Hill 2024:** the 22,000 "HGF" and 7,000 "Coronation" plants. What do HGF and Coronation mean? Did WRT plant them? Should they count?
- **Each contested species pair or group** (Review question "Contested species pairs"): one stock line or two?
- **Paper4Trees:** how should plants ordered through the scheme count?
- **Each site-number clash** (Review question "Site number disagrees with the register"). Examples: Welcome Forest carries Slope Hill's number; Akarua Corner typed 9E where the register says 9F; Derby St; a cell typed "!!A". Which number is right?
- **Sites with no WRT number:** is each a real site, and what number should it get?
- **Uncertain sites:** 1 Mile Creek; Gorge Rd Wetlands against QPS; Shotover River 28A or 28B.
- **Cleaned site headers:** is the cleaned name the right site? Do not ask for, or write down, any personal name that was removed.
- **The "TBC" cell** in Spring 2025.
- **Grand totals:** the workbook shows four different all-time totals; the app adds the rows to 140,068. Which figure does WRT quote to funders?
- **Gaps:** Autumn 2020 has only six sites; Spring 2026 is not in the history yet.
- **Names staff may not recognise:** macrons the app added to Māori names, the fixed typos in common names, and Kohukohu shown for Pittosporum tenuifolium. Are these the names WRT uses?

## How to write each question

One question per entry, in this shape:

```
### Q7. Slope Hill 2024: did 29,000 plants really go in?
- Where: /seasons/spring-2024 (screenshots/q07.png)
- What the app shows: one or two sentences, with the numbers.
- Why we have to ask: which reason above applies, in plain words.
- The question: one sentence. Offer choices where you can (a / b / something else).
- What the answer changes: e.g. "If they don't count, the all-time total falls from 140,068 to 111,068."
- Who probably knows: nursery manager, operations manager, or whoever kept the Plants Out Master.
- Records affected: N records, N recorded plants (the amber figure).
```

Wording rules:

- Plain NZ English, short words, sentence case.
- No jargon: no "record ID", "crosswalk", "parcel ID" or "row-5". Quote a cell address such as `MASTER!FK12` only when it helps them find the spot.
- Don't lead them towards an answer.
- One ask per entry. If 40 records raise the same question, write one question and say "40 records".

## Output

Write only to `~/wtr-app-tree-reforestation/docs/planning/gauntlet/`:

- **QUESTIONS.md** — the questions, largest number of plants affected first. At the top: one short paragraph on what this is, how many questions there are, and the five to ask first.
- **APP_CONFUSIONS.md** — things that confused you about the app itself (an unclear label, a chart you couldn't read, numbers on one screen that don't add up). Give the URL and a one-line suggested fix for each.
- **ANSWERED.md** — things you thought were questions but answered yourself, and where you found the answer.
- **screenshots/** — one `qNN.png` per question.

Don't edit any other file. Don't run git.

## Stop and tell Kyle if

- the app will not start or a page shows an error, or
- the same figure differs between two pages.
