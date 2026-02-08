"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

export type Language = "en" | "ko";

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
});

const translations: Record<Language, Record<string, string>> = {
  en: {
    // App
    "app.title": "Rowoon's Growth Book",
    "app.subtitle": "Track milestones, activities, and memories",
    "app.growth_book": "'s Growth Book",
    // Nav
    "nav.home": "Home",
    "nav.milestones": "Milestones",
    "nav.play": "Play",
    "nav.watch": "Watch",
    "nav.memo": "Memo",
    // Sidebar
    "sidebar.dashboard": "Dashboard",
    "sidebar.milestones": "Milestones",
    "sidebar.playtips": "Play Tips",
    "sidebar.watchouts": "Watch-Outs",
    "sidebar.memo": "Memo Journal",
    // Milestones
    "milestones.title": "Milestones - Month {month}",
    "milestones.subtitle": "{count} developmental milestones",
    "milestones.empty": "No milestones for month {month} yet.",
    "milestones.completed": "{completed} of {total} completed",
    "milestones.no_section": "No milestones in this section.",
    "milestones.mark_complete": "Mark \"{title}\" as complete",
    "milestones.mark_incomplete": "Mark \"{title}\" as incomplete",
    // Play tips
    "playtips.title": "Play Tips",
    "playtips.subtitle": "Activities for month {month}",
    "playtips.empty": "No play tips for this month yet.",
    // Watch-outs
    "watchouts.title": "Watch-Outs",
    "watchouts.subtitle": "Safety notes for month {month}",
    "watchouts.empty": "No watch-outs for this month.",
    // Categories
    "category.social": "Social",
    "category.language": "Language",
    "category.cognitive": "Cognitive",
    "category.physical": "Physical",
    // Difficulty
    "difficulty.easy": "Easy",
    "difficulty.medium": "Medium",
    "difficulty.hard": "Hard",
    "difficulty.advanced": "Advanced",
    // Severity
    "severity.urgent": "Urgent",
    "severity.caution": "Caution",
    "severity.info": "Info",
    // Memo
    "memo.title": "Memo Journal",
    "memo.new": "New Memo",
    "memo.empty": "No memos yet",
    "memo.write": "Write your first memo",
    "memo.cancel": "Cancel",
    "memo.save": "Save",
    "memo.edit": "Edit",
    "memo.delete": "Delete",
    "memo.edit_title": "Edit Memo",
    "memo.preview": "Preview",
    "memo.back": "Back",
    "memo.untitled": "Untitled",
    "memo.no_content": "No content",
    "memo.nothing_preview": "Nothing to preview",
    "memo.loading": "Loading...",
    "memo.edited": "edited",
    "memo.count": "{count} memos",
    "memo.count_one": "{count} memo",
    "memo.this_memo": "this memo",
    "memo.delete_title": "Delete Memo",
    "memo.delete_confirm": "Are you sure you want to delete \"{title}\"? This action cannot be undone.",
    "memo.placeholder.title": "Memo title...",
    "memo.placeholder.content": "Write your memo here... (supports markdown)",
    // Dashboard
    "dashboard.milestone_progress": "Milestone Progress",
    "dashboard.upcoming": "Upcoming Milestones",
    "dashboard.recent_memos": "Recent Memos",
    "dashboard.view_all": "View all",
    "dashboard.no_milestones": "No milestones available for month {month} yet.",
    "dashboard.all_completed": "All milestones for month {month} are completed!",
    "dashboard.milestones_completed": "{completed} of {total} milestones completed",
    // Quick actions
    "quick.milestones": "Milestones",
    "quick.milestones_desc": "Track developmental progress",
    "quick.playtips": "Play Tips",
    "quick.playtips_desc": "Fun activities for growth",
    "quick.watchouts": "Watch-Outs",
    "quick.watchouts_desc": "Things to keep an eye on",
    "quick.newmemo": "New Memo",
    "quick.newmemo_desc": "Record a memory or note",
    // Notifications
    "notify.blocked": "Notifications blocked",
    "notify.blocked_desc": "Enable in your browser settings to receive updates",
    "notify.enabled": "Notifications enabled",
    "notify.off": "Turn off",
    "notify.get_reminders": "Get milestone reminders",
    "notify.stay_updated": "Stay updated on Rowoon's growth",
    "notify.enable": "Enable",
    "notify.retry": "Retry",
    // Source
    "note.label": "Note for parents",
    "source.label": "Source",
    "source.view_original": "View original guideline",
    "source.info_for": "Source information for {title}",
    "source.disclaimer": "This information is based on published guidelines from {source}. Always consult your pediatrician for personalized advice.",
    "materials.label": "Materials needed:",
    "action.label": "What to do:",
    // Age
    "age.old": "old",
    "age.born": "Born",
    "age.month": "Month",
    "age.months": "months",
    "age.days": "days",
    "age.and": "and",
  },
  ko: {
    // App
    "app.title": "로운이의 성장 일기",
    "app.subtitle": "발달, 놀이, 안전, 그리고 추억 기록",
    "app.growth_book": "의 성장 일기",
    // Nav
    "nav.home": "홈",
    "nav.milestones": "발달",
    "nav.play": "놀이",
    "nav.watch": "주의",
    "nav.memo": "메모",
    // Sidebar
    "sidebar.dashboard": "홈",
    "sidebar.milestones": "발달 이정표",
    "sidebar.playtips": "놀이 팁",
    "sidebar.watchouts": "주의사항",
    "sidebar.memo": "메모 일기",
    // Milestones
    "milestones.title": "{month}개월 발달 이정표",
    "milestones.subtitle": "발달 이정표 {count}개",
    "milestones.empty": "{month}개월 발달 이정표가 아직 없어요.",
    "milestones.completed": "{total}개 중 {completed}개 완료",
    "milestones.no_section": "이 항목에 발달 이정표가 없어요.",
    "milestones.mark_complete": "\"{title}\" 완료로 표시",
    "milestones.mark_incomplete": "\"{title}\" 미완료로 표시",
    // Play tips
    "playtips.title": "놀이 팁",
    "playtips.subtitle": "{month}개월 놀이 활동",
    "playtips.empty": "이번 달 놀이 팁이 아직 없어요.",
    // Watch-outs
    "watchouts.title": "주의사항",
    "watchouts.subtitle": "{month}개월 안전 정보",
    "watchouts.empty": "이번 달 주의사항이 아직 없어요.",
    // Categories
    "category.social": "사회성",
    "category.language": "언어",
    "category.cognitive": "인지",
    "category.physical": "신체",
    // Difficulty
    "difficulty.easy": "쉬움",
    "difficulty.medium": "보통",
    "difficulty.hard": "어려움",
    "difficulty.advanced": "심화",
    // Severity
    "severity.urgent": "긴급",
    "severity.caution": "주의",
    "severity.info": "참고",
    // Memo
    "memo.title": "메모 일기",
    "memo.new": "새 메모",
    "memo.empty": "아직 메모가 없어요",
    "memo.write": "첫 번째 메모를 작성해보세요",
    "memo.cancel": "취소",
    "memo.save": "저장",
    "memo.edit": "수정",
    "memo.delete": "삭제",
    "memo.edit_title": "메모 수정",
    "memo.preview": "미리보기",
    "memo.back": "뒤로",
    "memo.untitled": "제목 없음",
    "memo.no_content": "내용이 없어요",
    "memo.nothing_preview": "미리볼 내용이 없어요",
    "memo.loading": "불러오는 중...",
    "memo.edited": "수정됨",
    "memo.count": "메모 {count}개",
    "memo.count_one": "메모 {count}개",
    "memo.this_memo": "이 메모",
    "memo.delete_title": "메모 삭제",
    "memo.delete_confirm": "\"{title}\"을(를) 삭제할까요? 되돌릴 수 없어요.",
    "memo.placeholder.title": "메모 제목...",
    "memo.placeholder.content": "메모를 작성하세요... (마크다운 지원)",
    // Dashboard
    "dashboard.milestone_progress": "발달 체크",
    "dashboard.upcoming": "남은 발달 이정표",
    "dashboard.recent_memos": "최근 메모",
    "dashboard.view_all": "모두 보기",
    "dashboard.no_milestones": "{month}개월 발달 이정표가 아직 없어요.",
    "dashboard.all_completed": "{month}개월 발달 이정표를 모두 완료했어요!",
    "dashboard.milestones_completed": "{total}개 중 {completed}개 완료",
    // Quick actions
    "quick.milestones": "발달 이정표",
    "quick.milestones_desc": "발달 과정 확인하기",
    "quick.playtips": "놀이 팁",
    "quick.playtips_desc": "성장에 도움되는 놀이",
    "quick.watchouts": "주의사항",
    "quick.watchouts_desc": "눈여겨볼 것들",
    "quick.newmemo": "새 메모",
    "quick.newmemo_desc": "추억이나 메모 기록",
    // Notifications
    "notify.blocked": "알림 차단됨",
    "notify.blocked_desc": "브라우저 설정에서 알림을 허용해 주세요",
    "notify.enabled": "알림 켜짐",
    "notify.off": "끄기",
    "notify.get_reminders": "발달 알림 받기",
    "notify.stay_updated": "로운이의 성장 소식을 받아보세요",
    "notify.enable": "켜기",
    "notify.retry": "다시 시도",
    // Source
    "note.label": "부모님께 안내",
    "source.label": "출처",
    "source.view_original": "원문 가이드라인 보기",
    "source.info_for": "{title} 출처 정보",
    "source.disclaimer": "이 정보는 {source} 가이드라인을 참고했어요. 우리 아이에게 맞는 조언은 소아과 선생님과 상담해 주세요.",
    "materials.label": "필요한 재료:",
    "action.label": "이렇게 해보세요:",
    // Age
    "age.old": "",
    "age.born": "출생일",
    "age.month": "개월",
    "age.months": "개월",
    "age.days": "일",
    "age.and": "",
  },
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("language") as Language | null;
    if (saved === "en" || saved === "ko") {
      setLangState(saved);
    }
    setMounted(true);
  }, []);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("language", newLang);
  }, []);

  const t = useCallback(
    (key: string) => {
      return translations[lang][key] ?? translations.en[key] ?? key;
    },
    [lang]
  );

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
