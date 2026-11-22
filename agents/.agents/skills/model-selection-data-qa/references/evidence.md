# Evidence

## Roster

| model | access | reasoning | tested as | result |
|---|---|---|---|---|
| Opus 5.5 | claude-code | medium | QA lead | chosen |
| Gemini 4 Neon | acp-antigravity | medium | QA worker | chosen |
| d3-ultra | self-hosted | none | decision model | chosen |
| Jev | TypeSafe API | none | decision model | fallback |
| Kimi K3.1 Pro | Ollama Cloud | low | QA worker, decision model | ruled out |
| Grok 4.7 | acp-cursor | high | QA worker | ruled out |
| Clef | Ollama Cloud | none | decision model | ruled out |

## QA worker: Gemini 4 Neon against Opus 5.5 (250 items)

| measure | result |
|---|---|
| Faults Neon found that Opus missed | 20 |
| Faults Opus found that Neon missed | 4 |
| Neon sure and wrong | 3 of 233 |
| Neon not sure | covered the hard cases |

## Decision model: d3-ultra against Jev (2,452 cards)

Accuracy at p >= 0.9, coverage in brackets.

| question | d3-ultra | Jev | use |
|---|---|---|---|
| Item type | 0.996 (86%) | 0.982 (60%) | d3-ultra |
| Box scope | 0.986 (67%) | 0.977 (23%) | d3-ultra |
| Visual type | 0.983 (67%) | 0.986 (45%) | d3-ultra |
| Visual kind | 0.973 (53%) | 0.988 (24%) | neither alone |
| Has a badge | 0.994 (97%) | 1.000 (66%) | d3-ultra |
| Emoji against logo | 0.839 (68%) | 0.940 (33%) | Jev, never alone |

| measure | result |
|---|---|
| Confident disagreements won | d3-ultra 224 to 52; Jev 10 to 3 on emoji |
| Box questions | Jev only |
| Training sharing its GPU | 2.4 times slower |
| Confident judge error | 1% to 3%, the size of the label error sought |

## Ruled out

| model | reason |
|---|---|
| Kimi K3.1 Pro | sure on 149 of 150 at 75% precision |
| Grok 4.7 | passed missing names as correct |
| Clef | covers only 33% of cards when confident |
