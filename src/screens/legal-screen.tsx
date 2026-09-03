"use client";

import { Header, Screen } from "@/components/shell/header";
import { useLanguage } from "@/hooks/use-language";
import { SUPPORT_EMAIL } from "@/lib/constants";
import { formatDate } from "@/i18n";

const UPDATED = "2026-09-02";

export function LegalScreen({ kind }: { kind: "privacy" | "terms" | "support" }) {
  const { lang, t } = useLanguage();
  const title = kind === "privacy" ? t("legal.privacy_title") : kind === "terms" ? t("legal.terms_title") : t("legal.support_title");
  const body = kind === "privacy" ? PRIVACY[lang] : kind === "terms" ? TERMS[lang] : SUPPORT[lang];
  return (
    <>
      <Header title={title} backHref="/settings" />
      <Screen>
        <p className="tnum mb-6 text-[0.8125rem] text-muted-foreground">{t("legal.updated", { date: formatDate(lang, `${UPDATED}T12:00:00`) })}</p>
        <div className="space-y-6">
          {body.map((s) => (
            <section key={s.h}>
              <h2 className="font-display mb-2 text-[1.125rem] font-semibold">{s.h}</h2>
              {s.p.map((p, i) => (
                <p key={i} className="mb-2 text-[0.9375rem] leading-relaxed">
                  {p.replace("{email}", SUPPORT_EMAIL)}
                </p>
              ))}
            </section>
          ))}
        </div>
      </Screen>
    </>
  );
}

type Sec = { h: string; p: string[] };

const PRIVACY: Record<"en" | "ko", Sec[]> = {
  en: [
    { h: "The short version", p: ["Sprout keeps your baby’s information on your device. There is no account, no analytics, no advertising, and no data is sold or shared."] },
    {
      h: "What Sprout stores",
      p: [
        "Your baby’s name and birthday, the milestones you confirm (with the date you confirmed them), your journal entries, and your language and settings.",
        "On the web this lives in your browser’s storage; in the iOS app it lives in the app’s storage on your phone. Deleting the app, clearing site data, or using Settings › Delete all data removes it.",
      ],
    },
    {
      h: "Backups",
      p: ["Settings › Export a backup creates a file containing the data above. You choose where it goes. Restoring a backup replaces the data on the device."],
    },
    {
      h: "Reminders",
      p: [
        "In the iOS app, monthly reminders are scheduled on your phone. Nothing leaves the device.",
        "In the web app, if you turn on notifications, your browser issues an anonymous push subscription (an endpoint URL and encryption keys). Sprout stores that subscription on its server to send reminders. It contains no personal information and is deleted when you turn notifications off or when the subscription expires.",
      ],
    },
    {
      h: "External links",
      p: ["Source links open pages run by the CDC, AAP, WHO, Zero to Three, NAEYC, CPSC and Pathways.org. Those sites have their own privacy practices."],
    },
    { h: "Children", p: ["Sprout is a tool for parents and caregivers. It does not knowingly collect information from children."] },
    { h: "Contact", p: ["Questions about privacy: {email}."] },
  ],
  ko: [
    { h: "요약", p: ["새싹은 아기 정보를 사용자의 기기에만 보관해요. 계정도, 분석 도구도, 광고도 없고, 어떤 정보도 팔거나 공유하지 않아요."] },
    {
      h: "새싹이 저장하는 정보",
      p: [
        "아기 이름과 생일, 확인한 발달 이정표(확인한 날짜 포함), 기록, 언어와 설정이에요.",
        "웹에서는 브라우저 저장 공간에, iOS 앱에서는 휴대폰의 앱 저장 공간에 보관돼요. 앱을 삭제하거나, 사이트 데이터를 지우거나, 설정 › 모든 데이터 삭제를 누르면 지워져요.",
      ],
    },
    { h: "백업", p: ["설정 › 백업 내보내기로 위 정보가 담긴 파일을 만들 수 있어요. 파일을 어디에 둘지는 사용자가 정해요. 백업을 불러오면 기기의 데이터가 백업 내용으로 바뀌어요."] },
    {
      h: "알림",
      p: [
        "iOS 앱의 월별 알림은 휴대폰 안에서 예약돼요. 어떤 정보도 기기 밖으로 나가지 않아요.",
        "웹에서 알림을 켜면 브라우저가 익명 푸시 구독 정보(엔드포인트 주소와 암호화 키)를 만들어요. 새싹은 알림을 보내기 위해 이 구독 정보를 서버에 보관해요. 개인정보는 들어 있지 않고, 알림을 끄거나 구독이 만료되면 삭제돼요.",
      ],
    },
    { h: "외부 링크", p: ["출처 링크는 CDC, AAP, WHO, Zero to Three, NAEYC, CPSC, Pathways.org가 운영하는 페이지로 연결돼요. 각 사이트의 개인정보 정책은 따로 있어요."] },
    { h: "어린이", p: ["새싹은 부모와 양육자를 위한 도구예요. 어린이의 정보를 의도적으로 수집하지 않아요."] },
    { h: "문의", p: ["개인정보 관련 문의: {email}"] },
  ],
};

const TERMS: Record<"en" | "ko", Sec[]> = {
  en: [
    {
      h: "What Sprout is",
      p: [
        "Sprout is a record-keeping tool for parents. Milestones, play ideas and safety notes are drawn from published guidance by the CDC, AAP (HealthyChildren.org), WHO, Zero to Three, NAEYC, CPSC and Pathways.org, and every item links to its source.",
      ],
    },
    {
      h: "Not medical advice",
      p: [
        "Nothing in Sprout is medical advice, diagnosis or treatment. Every child develops at their own pace. If you have any concern about your child’s health or development, talk to your pediatrician. In an emergency, call your local emergency number.",
      ],
    },
    { h: "Your content", p: ["Journal entries and confirmations are yours and stay on your device. You are responsible for keeping backups."] },
    { h: "Changes", p: ["Content and features may change as guidance is updated. Sprout is provided as is, without warranty of any kind, to the extent permitted by law."] },
    { h: "Contact", p: ["Questions: {email}."] },
  ],
  ko: [
    { h: "새싹은 무엇인가요", p: ["새싹은 부모를 위한 기록 도구예요. 발달 이정표, 놀이, 주의사항은 CDC, AAP(HealthyChildren.org), WHO, Zero to Three, NAEYC, CPSC, Pathways.org가 공개한 지침을 바탕으로 했고, 모든 항목에 출처 링크가 있어요."] },
    {
      h: "의학적 조언이 아니에요",
      p: ["새싹의 내용은 진단이나 치료를 위한 의학적 조언이 아니에요. 아이마다 자라는 속도가 달라요. 아이의 건강이나 발달이 걱정되면 소아과 선생님과 상담해 주세요. 응급 상황에서는 119에 연락해 주세요."],
    },
    { h: "내 콘텐츠", p: ["기록과 확인 내역은 사용자의 것이고 기기에만 남아요. 백업은 사용자가 직접 관리해요."] },
    { h: "변경", p: ["지침이 바뀌면 내용과 기능도 바뀔 수 있어요. 새싹은 법이 허용하는 범위에서 어떤 보증도 없이 있는 그대로 제공돼요."] },
    { h: "문의", p: ["문의: {email}"] },
  ],
};

const SUPPORT: Record<"en" | "ko", Sec[]> = {
  en: [
    { h: "Contact", p: ["Email {email}. Replies usually within two days. Include your iPhone model and iOS version if something looks wrong."] },
    {
      h: "Common questions",
      p: [
        "Where is my data? On this device only. Settings › Export a backup saves a file you can move to another phone and restore there.",
        "My baby was born early. Add the due date in the profile; until 24 months Sprout counts from it, the way pediatricians do.",
        "Why does a milestone say “CDC lists this by 9 months”? The book places some milestones a little early so you can watch for them; the note tells you the age by which most children do it.",
        "Reminders: the iOS app schedules them on the phone (a note on each monthly birthday and one tip on Sunday mornings). On the web, add Sprout to your Home Screen, then turn notifications on from the Home card.",
        "Wrong or unclear content? Every item has a source card with a link and the date the sources were last checked. Tell us what you found; corrections ship quickly.",
      ],
    },
    { h: "Not medical advice", p: ["Sprout is a record-keeping tool. If you have any concern about your child’s health or development, talk to your pediatrician."] },
  ],
  ko: [
    { h: "문의", p: ["{email}로 메일을 보내 주세요. 보통 이틀 안에 답해 드려요. 문제가 있다면 아이폰 기종과 iOS 버전을 함께 적어 주세요."] },
    {
      h: "자주 묻는 질문",
      p: [
        "내 데이터는 어디에 있나요? 이 기기에만 있어요. 설정 › 백업 내보내기로 파일을 만들어 다른 휴대폰에서 불러올 수 있어요.",
        "아기가 일찍 태어났어요. 아기 정보에 출산 예정일을 넣어 주세요. 24개월까지는 소아과에서처럼 예정일 기준으로 계산해요.",
        "발달 이정표에 “CDC는 9개월까지…”라고 적힌 이유는? 미리 살펴볼 수 있도록 조금 이른 달에 넣은 항목이 있어요. 그 문장은 대부분의 아이가 해내는 시기를 알려 드리는 거예요.",
        "알림: iOS 앱은 휴대폰 안에서 예약해요(한 달 더 자란 날 아침, 그리고 일요일 아침 팁 하나). 웹에서는 홈 화면에 추가한 뒤 홈 카드에서 알림을 켜 주세요.",
        "내용이 틀리거나 어색하다면? 모든 항목에 출처 카드와 링크, 출처 확인일이 있어요. 알려 주시면 빠르게 고칠게요.",
      ],
    },
    { h: "의학적 조언이 아니에요", p: ["새싹은 기록 도구예요. 아이의 건강이나 발달이 걱정되면 소아과 선생님과 상담해 주세요."] },
  ],
};
