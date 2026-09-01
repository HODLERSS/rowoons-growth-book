# Korean style guide — Sprout (새싹)

The Korean text is not a translation of the English; it is the same book written by the same person in Korean.
English is the source of *facts* (every claim, number and citation); Korean owns its *phrasing*.

## Register
- **해요체 everywhere**: …해요 / …이에요 / …예요 / …해 주세요 / …거든요.
- Never 합니다체 (…합니다, …입니다, …하십시오) and never plain style (…한다, …이다, …해라) outside quoted speech.
- No exclamation marks in system UI. In content, at most one per item and only where the English has one.

## Who is speaking to whom
- The reader is 엄마 아빠. Address them as 엄마 아빠 or not at all. Never 여러분, 당신, 부모님(in body text), 보호자.
- The child is 아기 through month 12 and 아이 from month 13 (the English switches baby → toddler at the same point).
- Doctors are 소아과 선생님. Daycare is 어린이집.

## Vocabulary (fixed)
| English | Korean |
|---|---|
| milestone(s) | 발달 이정표 |
| tummy time | 터미타임 |
| watch-out / safety | 주의사항 / 안전 |
| play tip | 놀이 팁 |
| journal / memo | 기록 |
| car seat, rear-facing | 카시트, 뒤보기 |
| SIDS | 영아돌연사증후군(SIDS) — full form on first use in an item |
| solids | 이유식 |
| stranger anxiety | 낯가림 |
| separation anxiety | 분리불안 |
| well-child visit / check-up | 영유아 검진 |
| choking hazard | 질식 위험 |
| pediatrician | 소아과 선생님 |
| cooing / babbling | 쿠잉 / 옹알이 |
| fine motor / gross motor | 소근육 / 대근육 |

## Units and numbers
- Metric only: inches → cm, feet → m, pounds → kg, °F → °C. Round sensibly (8–12 in → 20~30cm).
- Ranges use a tilde with no spaces: 6~8번, 20~30cm. Units attach to the number: 3개월, 30cm, 2시간.
- Ages: N개월 N일. Counts: N개, N번.

## Punctuation
- Ellipsis is … (one character), never three dots.
- Quotes: '안 돼' for words and short phrases, "…" for speech. Korean text uses the same straight quotes as the source JSON.
- One sentence, one idea. Aim for ≤ 40 characters per sentence; split long English sentences.

## Particles
- 을/를, 이/가, 은/는, 과/와, 으로/로 follow the final consonant (받침) of the preceding syllable.
- Dynamic UI strings never hard-code a particle: use the `josa()` helper (`{title}` + 을/를) so names like 로운 and 하나 both read correctly.

## Translationese to remove
| Avoid | Write |
|---|---|
| ~하는 것을 확인하세요 | ~인지 확인해 주세요 |
| 당신의 아기 / 그, 그녀 | 아기 / (drop the pronoun) |
| ~할 수 있습니다 | ~할 수 있어요 |
| ~되어집니다, ~되어지고 | ~돼요 |
| ~에 대해 이야기하세요 | ~에 대해 말해 주세요 / ~ 이야기해 주세요 |
| 기억하세요! / 명심하세요 | (state the rule plainly) |
| 놀라운 / 경이로운 / 마법 같은 | (drop — the fact is enough) |

## Quotes from sources (`sourceQuote`)
- Render the source's sentence faithfully in Korean; add nothing, soften nothing. Keep the organisation name in Latin
  (CDC, AAP, WHO). The UI labels it as a quotation from that source.

## Titles
- Milestone titles: a verb phrase ending in 요, ≤ 18 characters (one line on an iPhone at 15px; e.g. 엄마 아빠 목소리를 알아요).
- Play-tip titles: a noun phrase, ≤ 14 characters (e.g. 흑백 그림 보여주기).
- Watch-out titles: a noun phrase naming the hazard or rule (e.g. 안전한 잠자리, 카시트 안전).

## Structural parity (machine-checked)
Same `id`, `month`, `category`, `severity`, `difficulty`, `sourceUrl`, and `materials` presence as the English item.
Every English id exists in Korean; no extra Korean ids. Run `python3 scripts/qa/content_check.py`.
