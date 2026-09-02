#!/usr/bin/env python3
"""One-off content correction after the 2026-09-02 source audit (qa/source-audit.json).

CDC rewrote its milestone checklists in 2022 (now "what most children do by", 75th percentile). Several
milestones in this book cited a CDC age page they no longer appear on, or that lists them at a later age.
This script re-cites each to the page that actually carries it, rewrites the source summary to say what
that page says, and, where the old milestone was dropped from CDC's lists, replaces it with the current
CDC item for that age. Applied to EN and KO together so parity checks keep passing.
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
EN_P = os.path.join(ROOT, "src/content/milestones.json")
KO_P = os.path.join(ROOT, "src/content/ko/milestones.json")
CDC = lambda slug: f"https://www.cdc.gov/act-early/milestones/{slug}.html"
AAP1 = "https://www.healthychildren.org/English/ages-stages/baby/Pages/Developmental-Milestones-1-Month.aspx"
AAP3 = "https://www.healthychildren.org/English/ages-stages/baby/Pages/Developmental-Milestones-3-Months.aspx"
AAP_TANTRUM = "https://www.healthychildren.org/English/family-life/family-dynamics/communication-discipline/Pages/Temper-Tantrums.aspx"

# id -> {en: {...fields}, ko: {...fields}}  (fields merged over the existing record)
FIX = {
    "m-1-social-1": {
        "en": {"source": "AAP", "sourceUrl": AAP1, "sourceSummary": "AAP's one-month milestones include looking or turning toward familiar sounds and voices."},
        "ko": {"source": "AAP", "sourceUrl": AAP1, "sourceSummary": "AAP 1개월 발달 이정표에는 익숙한 소리나 목소리 쪽을 보거나 고개를 돌리는 것이 들어 있어요."},
    },
    "m-1-physical-2": {
        "en": {"source": "AAP", "sourceUrl": AAP1, "sourceSummary": "AAP lists strong reflex movements among one-month milestones; the grasp reflex fades as intentional grasping develops."},
        "ko": {"source": "AAP", "sourceUrl": AAP1, "sourceSummary": "AAP는 1개월 발달 이정표로 강한 반사 움직임을 꼽아요. 파악 반사는 의도적으로 잡는 능력이 발달하면서 사라져요."},
    },
    "m-3-cognitive-1": {
        "en": {"source": "AAP", "sourceUrl": AAP3, "sourceSummary": "AAP's 1–4-month milestones include the eyes following moving objects by 2 months."},
        "ko": {"source": "AAP", "sourceUrl": AAP3, "sourceSummary": "AAP 1~4개월 발달 이정표에는 2개월까지 눈으로 움직이는 물체를 따라가는 것이 들어 있어요."},
    },
    "m-3-physical-2": {
        "en": {"source": "AAP", "sourceUrl": AAP3, "sourceSummary": "AAP's 1–4-month milestones include opening the hands briefly by 2 months and starting to use hands and eyes together."},
        "ko": {"source": "AAP", "sourceUrl": AAP3, "sourceSummary": "AAP 1~4개월 발달 이정표에는 2개월까지 손을 잠깐 펴는 것과 손과 눈을 함께 쓰기 시작하는 것이 들어 있어요."},
    },
    # Dropped from CDC's 2022 4-month list → replaced with current 4-month items.
    "m-4-social-1": {
        "en": {"title": "Chuckles when you make them laugh", "description": "Not a full belly laugh yet, but a chuckle when you play silly. Your baby is discovering that you are the funniest person in the world.",
               "sourceUrl": CDC("4-months"), "sourceSummary": "CDC's 4-month checklist includes chuckling (not yet a full laugh) when you try to make them laugh."},
        "ko": {"title": "웃기면 킥킥 웃어요", "description": "아직 큰 웃음은 아니지만, 우스꽝스럽게 놀아 주면 킥킥 웃어요. 엄마 아빠가 세상에서 제일 재미있는 사람이라는 걸 알아가고 있어요.",
               "sourceUrl": CDC("4-months"), "sourceSummary": "CDC 4개월 체크리스트에는 웃기려고 하면 킥킥 웃는 것(아직 큰 웃음은 아니에요)이 들어 있어요."},
    },
    "m-4-social-2": {
        "en": {"title": "Works to keep your attention", "description": "Your baby looks at you, wiggles, or makes sounds to get your attention and keep the play going. When you stop, they let you know.",
               "sourceUrl": CDC("4-months"), "sourceSummary": "CDC's 4-month checklist includes looking at you, moving, or making sounds to get or keep your attention."},
        "ko": {"title": "관심을 끌려고 해요", "description": "엄마 아빠를 쳐다보고, 꼼지락거리고, 소리를 내면서 관심을 끌고 놀이를 이어 가려 해요. 놀이를 멈추면 바로 티를 내요.",
               "sourceUrl": CDC("4-months"), "sourceSummary": "CDC 4개월 체크리스트에는 엄마 아빠를 쳐다보거나 움직이거나 소리를 내서 관심을 끌고 이어 가려는 것이 들어 있어요."},
    },
    "m-4-language-1": {
        "en": {"title": "Makes sounds back when you talk", "description": "Talk to your baby and pause: they answer with coos and gurgles. These first back-and-forths are the start of conversation.",
               "sourceUrl": CDC("4-months"), "sourceSummary": "CDC's 4-month checklist includes making sounds back when you talk to them."},
        "ko": {"title": "말을 걸면 소리로 대답해요", "description": "말을 걸고 잠깐 기다리면 옹알이로 대답해요. 이렇게 주고받는 게 대화의 시작이에요.",
               "sourceUrl": CDC("4-months"), "sourceSummary": "CDC 4개월 체크리스트에는 말을 걸면 소리로 대답하는 것이 들어 있어요."},
    },
    "m-4-physical-2": {
        "en": {"title": "Pushes up on elbows on tummy", "description": "During tummy time your baby props up on their forearms and lifts their chest to look around. Neck, shoulder and back muscles are getting strong.",
               "sourceUrl": CDC("4-months"), "sourceSummary": "CDC's 4-month checklist includes pushing up onto elbows or forearms when on the tummy."},
        "ko": {"title": "엎드려서 팔꿈치로 밀어 올려요", "description": "터미 타임에 팔뚝으로 몸을 받치고 가슴을 들어 주변을 둘러봐요. 목, 어깨, 등 근육이 튼튼해지고 있어요.",
               "sourceUrl": CDC("4-months"), "sourceSummary": "CDC 4개월 체크리스트에는 엎드린 자세에서 팔꿈치나 팔뚝으로 밀어 올리는 것이 들어 있어요."},
    },
    # CDC now lists name response at 9 months.
    "m-5-language-2": {
        "en": {"description": "Your baby may be starting to turn their head when you call their name. Many begin now; CDC lists it as something most babies do by 9 months, so there is no worry if it comes later.",
               "sourceUrl": CDC("9-months"), "sourceSummary": "CDC's 9-month checklist includes looking when you call their name; most babies do this by 9 months."},
        "ko": {"description": "이름을 부르면 고개를 돌리기 시작할 수 있어요. 지금 시작하는 아기도 많지만, CDC는 9개월까지 대부분의 아기가 하게 되는 것으로 봐요. 조금 늦어도 괜찮아요.",
               "sourceUrl": CDC("9-months"), "sourceSummary": "CDC 9개월 체크리스트에는 이름을 부르면 쳐다보는 것이 들어 있어요. 대부분의 아기가 9개월까지 이렇게 해요."},
    },
    "m-6-language-1": {
        "en": {"description": "When you call your baby's name, they turn toward you more and more reliably. CDC lists this as something most babies do by 9 months.",
               "sourceUrl": CDC("9-months"), "sourceSummary": "CDC's 9-month checklist includes looking when you call their name; most babies do this by 9 months."},
        "ko": {"description": "이름을 부르면 점점 더 확실하게 엄마 아빠 쪽으로 돌아봐요. CDC는 9개월까지 대부분의 아기가 하게 되는 것으로 봐요.",
               "sourceUrl": CDC("9-months"), "sourceSummary": "CDC 9개월 체크리스트에는 이름을 부르면 쳐다보는 것이 들어 있어요. 대부분의 아기가 9개월까지 이렇게 해요."},
    },
    "m-6-language-2": {
        "en": {"sourceSummary": "CDC's 6-month checklist includes taking turns making sounds with you and making squealing noises."},
        "ko": {"sourceSummary": "CDC 6개월 체크리스트에는 엄마 아빠와 번갈아 소리 내기, 꺅꺅 소리 내기가 들어 있어요."},
    },
    "m-8-cognitive-1": {
        "en": {"sourceSummary": "CDC's 9-month checklist includes banging two things together and looking for objects when they drop out of sight."},
        "ko": {"sourceSummary": "CDC 9개월 체크리스트에는 물건 두 개를 마주 두드리기, 떨어져서 안 보이는 물건 찾기가 들어 있어요."},
    },
    "m-8-cognitive-2": {
        "en": {"sourceSummary": "CDC's 9-month checklist includes looking for objects when they are dropped out of sight, like a spoon or toy."},
        "ko": {"sourceSummary": "CDC 9개월 체크리스트에는 숟가락이나 장난감이 떨어져서 안 보일 때 찾아보는 것이 들어 있어요."},
    },
    "m-9-cognitive-1": {
        "en": {"sourceSummary": "CDC's 9-month checklist includes looking for objects when they are dropped out of sight, like a spoon or toy."},
        "ko": {"sourceSummary": "CDC 9개월 체크리스트에는 숟가락이나 장난감이 떨어져서 안 보일 때 찾아보는 것이 들어 있어요."},
    },
    # "Has favorite toys" is not on any current checklist → replaced with CDC 9-month social items.
    "m-8-social-2": {
        "en": {"title": "Shows several facial expressions", "description": "Happy, sad, angry, surprised: your baby's face now shows a range of clear expressions, and you can read their mood at a glance.",
               "source": "CDC", "sourceUrl": CDC("9-months"), "sourceSummary": "CDC's 9-month checklist includes showing several facial expressions, like happy, sad, angry, and surprised."},
        "ko": {"title": "표정이 다양해져요", "description": "기쁨, 슬픔, 화남, 놀람까지, 얼굴에 여러 감정이 또렷하게 드러나요. 이제 표정만 봐도 기분을 읽을 수 있어요.",
               "source": "CDC", "sourceUrl": CDC("9-months"), "sourceSummary": "CDC 9개월 체크리스트에는 기쁨, 슬픔, 화남, 놀람 같은 여러 표정을 짓는 것이 들어 있어요."},
    },
    "m-9-social-2": {
        "en": {"title": "Reacts when you leave", "description": "When you walk away, your baby looks after you, reaches for you, or cries. It shows how attached they are, and that they know you exist even out of sight.",
               "sourceUrl": CDC("9-months"), "sourceSummary": "CDC's 9-month checklist includes reacting when you leave (looks, reaches for you, or cries)."},
        "ko": {"title": "엄마 아빠가 가면 반응해요", "description": "엄마 아빠가 자리를 뜨면 쳐다보거나, 손을 뻗거나, 울어요. 그만큼 애착이 깊고, 안 보여도 엄마 아빠가 있다는 걸 안다는 뜻이에요.",
               "sourceUrl": CDC("9-months"), "sourceSummary": "CDC 9개월 체크리스트에는 엄마 아빠가 자리를 뜨면 반응하는 것(쳐다보기, 손 뻗기, 울기)이 들어 있어요."},
    },
    "m-9-language-1": {
        "en": {"description": "Baby pauses or stops briefly when you say 'no,' showing they understand the word even if they don't always comply. CDC lists this as something most babies do by 12 months.",
               "sourceUrl": CDC("1-year"), "sourceSummary": "CDC's 12-month checklist includes understanding 'no' (pausing briefly or stopping when you say it)."},
        "ko": {"description": "'안 돼' 하면 잠깐 멈칫하거나 행동을 멈춰요. 항상 말을 듣는 건 아니지만, 그 말이 무슨 뜻인지는 알고 있는 거예요. CDC는 12개월까지 대부분의 아기가 하게 되는 것으로 봐요.",
               "sourceUrl": CDC("1-year"), "sourceSummary": "CDC 12개월 체크리스트에는 '안 돼'를 알아듣는 것(말하면 잠깐 멈칫하거나 멈추기)이 들어 있어요."},
    },
    "m-9-physical-1": {
        "en": {"description": "Baby can pull up to standing using furniture or your hands and briefly hold the position while supported. CDC lists pulling up and cruising as something most babies do by 12 months.",
               "sourceUrl": CDC("1-year"), "sourceSummary": "CDC's 12-month checklist includes pulling up to stand and walking while holding on to furniture."},
        "ko": {"description": "가구나 엄마 아빠 손을 붙잡고 일어나서 잠깐 서 있을 수 있어요. 다리에 힘이 붙고 있는 거예요. CDC는 12개월까지 대부분의 아기가 붙잡고 일어서는 것으로 봐요.",
               "sourceUrl": CDC("1-year"), "sourceSummary": "CDC 12개월 체크리스트에는 붙잡고 일어서기, 가구를 잡고 걷기가 들어 있어요."},
    },
    "m-12-social-1": {
        "en": {"sourceUrl": CDC("9-months"), "sourceSummary": "CDC's 9-month checklist includes being shy, clingy, or fearful around strangers; it often continues well past the first birthday."},
        "ko": {"sourceUrl": CDC("9-months"), "sourceSummary": "CDC 9개월 체크리스트에는 낯선 사람 앞에서 수줍어하거나 매달리거나 무서워하는 것이 들어 있어요. 돌이 지나서도 흔히 이어져요."},
    },
    "m-12-social-2": {
        "en": {"sourceUrl": CDC("15-months"), "sourceSummary": "CDC's 15-month checklist includes showing you an object they like; by 18 months, looking at a few pages of a book with you."},
        "ko": {"sourceUrl": CDC("15-months"), "sourceSummary": "CDC 15개월 체크리스트에는 좋아하는 물건을 보여 주는 것이, 18개월에는 책을 몇 장 함께 보는 것이 들어 있어요."},
    },
    # "Repeats actions that get attention" is not on any current checklist → replaced with CDC 12-month item.
    "m-12-social-3": {
        "en": {"title": "Plays games with you, like pat-a-cake", "description": "Your baby joins in on simple games, clapping along to pat-a-cake or waiting for the peek-a-boo reveal. Taking turns like this is early conversation without words.",
               "sourceSummary": "CDC's 12-month checklist includes playing games with you, like pat-a-cake."},
        "ko": {"title": "짝짜꿍 같은 놀이를 함께 해요", "description": "짝짜꿍에 맞춰 손뼉을 치거나 까꿍 놀이의 '까꿍!'을 기다리며 간단한 놀이에 함께 참여해요. 이렇게 차례를 주고받는 게 말 없는 첫 대화예요.",
               "sourceSummary": "CDC 12개월 체크리스트에는 짝짜꿍 같은 놀이를 함께 하는 것이 들어 있어요."},
    },
    "m-12-language-2": {
        "en": {"description": "Baby attempts to copy words they hear, even if the pronunciation isn't quite right yet. CDC lists one or two words besides 'mama' and 'dada' by 15 months.",
               "sourceUrl": CDC("15-months"), "sourceSummary": "CDC's 15-month checklist includes trying to say one or two words besides 'mama' or 'dada,' like 'ba' for ball."},
        "ko": {"description": "주변에서 들리는 단어를 어설프게나마 따라 말하려 해요. 발음은 아직 엉성하지만, 열심히 시도하는 중이에요. CDC는 15개월까지 '엄마', '아빠' 외에 한두 단어를 말하려 하는 것으로 봐요.",
               "sourceUrl": CDC("15-months"), "sourceSummary": "CDC 15개월 체크리스트에는 '엄마', '아빠' 외에 한두 단어를 말하려 하는 것이 들어 있어요. 공을 '고'라고 하는 식이에요."},
    },
    "m-12-cognitive-2": {
        "en": {"sourceUrl": CDC("15-months"), "sourceSummary": "CDC's 15-month checklist includes trying to use things the right way, like a phone, cup, or book."},
        "ko": {"sourceUrl": CDC("15-months"), "sourceSummary": "CDC 15개월 체크리스트에는 전화기, 컵, 책 같은 물건을 제대로 쓰려고 하는 것이 들어 있어요."},
    },
    "m-12-physical-1": {
        "en": {"sourceUrl": CDC("15-months"), "sourceSummary": "CDC lists pulling up to stand and cruising along furniture by 12 months, and taking a few steps alone by 15 months."},
        "ko": {"sourceUrl": CDC("15-months"), "sourceSummary": "CDC는 12개월까지 붙잡고 일어서기와 가구 잡고 걷기를, 15개월까지 혼자 몇 걸음 걷기를 대부분의 아기가 하는 것으로 봐요."},
    },
    "m-12-physical-2": {
        "en": {"sourceSummary": "CDC's 12-month checklist includes picking things up between thumb and pointer finger, like small bits of food."},
        "ko": {"sourceSummary": "CDC 12개월 체크리스트에는 작은 음식 조각을 엄지와 검지로 집는 것이 들어 있어요."},
    },
    "m-13-social-1": {
        "en": {"sourceUrl": CDC("15-months"), "sourceSummary": "CDC's 15-month checklist includes showing you affection with hugs, cuddles, or kisses."},
        "ko": {"sourceUrl": CDC("15-months"), "sourceSummary": "CDC 15개월 체크리스트에는 안아 주고, 파고들고, 뽀뽀하며 애정을 표현하는 것이 들어 있어요."},
    },
    "m-18-social-3": {
        "en": {"sourceUrl": CDC("15-months"), "sourceSummary": "CDC's 15-month checklist includes showing you affection with hugs, cuddles, or kisses."},
        "ko": {"sourceUrl": CDC("15-months"), "sourceSummary": "CDC 15개월 체크리스트에는 안아 주고, 파고들고, 뽀뽀하며 애정을 표현하는 것이 들어 있어요."},
    },
    "m-15-language-1": {
        "en": {"title": "Tries to say 1 or 2 new words", "description": "Besides 'mama' and 'dada', your toddler tries one or two more words, like 'ba' for ball. Pronunciation doesn't matter; the attempt does.",
               "sourceSummary": "CDC's 15-month checklist includes trying to say one or two words besides 'mama' or 'dada,' like 'ba' for ball or 'da' for dog."},
        "ko": {"title": "새 단어 한두 개를 말하려 해요", "description": "'엄마', '아빠' 말고도 공을 '고'라고 하는 것처럼 한두 단어를 더 말하려 해요. 발음은 중요하지 않아요. 시도하는 게 중요해요.",
               "sourceSummary": "CDC 15개월 체크리스트에는 '엄마', '아빠' 외에 한두 단어를 말하려 하는 것이 들어 있어요."},
    },
    "m-18-social-1": {
        "en": {"source": "AAP", "sourceUrl": AAP_TANTRUM, "sourceSummary": "AAP explains that tantrums are a normal part of development between ages 1 and 3 and tend to ease after 3."},
        "ko": {"source": "AAP", "sourceUrl": AAP_TANTRUM, "sourceSummary": "AAP는 떼쓰기가 1~3세 사이에 자연스럽게 나타나며 3세가 지나면 줄어드는 경향이 있다고 설명해요."},
    },
    "m-18-cognitive-2": {
        "en": {"sourceUrl": CDC("15-months"), "sourceSummary": "CDC's 15-month checklist includes trying to use things the right way, like a phone, cup, or book."},
        "ko": {"sourceUrl": CDC("15-months"), "sourceSummary": "CDC 15개월 체크리스트에는 전화기, 컵, 책 같은 물건을 제대로 쓰려고 하는 것이 들어 있어요."},
    },
    "m-24-cognitive-1": {
        "en": {"sourceUrl": CDC("30-months"), "sourceSummary": "CDC's 30-month checklist includes using the hands to twist things, like turning doorknobs or unscrewing lids."},
        "ko": {"sourceUrl": CDC("30-months"), "sourceSummary": "CDC 30개월 체크리스트에는 문손잡이를 돌리거나 뚜껑을 여는 것처럼 손으로 비트는 동작이 들어 있어요."},
    },
    "m-36-social-3": {
        "en": {"sourceUrl": CDC("2-years"), "sourceSummary": "CDC's 2-year checklist includes noticing when others are hurt or upset, like pausing or looking sad when someone is crying."},
        "ko": {"sourceUrl": CDC("2-years"), "sourceSummary": "CDC 2세 체크리스트에는 다른 사람이 다치거나 속상해할 때 알아차리는 것(누가 울면 멈칫하거나 슬픈 표정 짓기)이 들어 있어요."},
    },
}


def apply(path, lang):
    data = json.load(open(path, encoding="utf-8"))
    byid = {x["id"]: x for x in data}
    for i, patch in FIX.items():
        if i not in byid:
            sys.exit(f"missing id {i} in {path}")
        rec = byid[i]
        p = patch[lang]
        if "title" in p:
            dupes = [x for x in data if x["month"] == rec["month"] and x["id"] != i and x["title"] == p["title"]]
            if dupes:
                sys.exit(f"{lang} {i}: new title duplicates {dupes[0]['id']}")
        rec.update(p)
    json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    open(path, "a", encoding="utf-8").write("\n")
    return len(FIX)


n = apply(EN_P, "en")
apply(KO_P, "ko")
print(f"applied {n} corrections to EN and KO milestones")
