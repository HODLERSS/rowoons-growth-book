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
    "app.title": "Rowoon's Growth Book",
    "app.subtitle": "Track milestones, activities, and memories",
    "nav.home": "Home",
    "nav.milestones": "Milestones",
    "nav.play": "Play",
    "nav.watch": "Watch",
    "nav.memo": "Memo",
    "milestones.title": "Milestones - Month {month}",
    "milestones.subtitle": "{count} developmental milestones",
    "milestones.empty": "No milestones for month {month} yet.",
    "milestones.completed": "{completed} of {total} completed",
    "playtips.title": "Play Tips",
    "playtips.subtitle": "Activities for month {month}",
    "watchouts.title": "Watch-Outs",
    "watchouts.subtitle": "Safety notes for month {month}",
    "memo.title": "Memo Journal",
    "memo.new": "New Memo",
    "memo.empty": "No memos yet",
    "memo.write": "Write your first memo",
    "memo.cancel": "Cancel",
    "memo.save": "Save",
    "memo.edit": "Edit",
    "memo.delete": "Delete",
    "memo.preview": "Preview",
    "memo.placeholder.title": "Memo title...",
    "memo.placeholder.content": "Write your memo here... (supports markdown)",
    "note.label": "Note for parents",
    "dashboard.milestone_progress": "Milestone Progress",
    "dashboard.upcoming": "Upcoming Milestones",
    "dashboard.recent_memos": "Recent Memos",
    "dashboard.view_all": "View all",
    "source.label": "Source",
    "materials.label": "Materials needed:",
    "action.label": "What to do:",
    "age.old": "old",
    "age.born": "Born",
    "age.month": "Month",
    "age.months": "months",
    "age.days": "days",
    "age.and": "and",
  },
  ko: {
    "app.title": "로운이의 성장 일기",
    "app.subtitle": "발달, 놀이, 안전, 그리고 추억 기록",
    "nav.home": "홈",
    "nav.milestones": "발달",
    "nav.play": "놀이",
    "nav.watch": "주의",
    "nav.memo": "메모",
    "milestones.title": "{month}개월 발달 이정표",
    "milestones.subtitle": "발달 이정표 {count}개",
    "milestones.empty": "{month}개월 발달 이정표가 아직 없어요.",
    "milestones.completed": "{total}개 중 {completed}개 완료",
    "playtips.title": "놀이 팁",
    "playtips.subtitle": "{month}개월 놀이 활동",
    "watchouts.title": "주의사항",
    "watchouts.subtitle": "{month}개월 안전 정보",
    "memo.title": "메모 일기",
    "memo.new": "새 메모",
    "memo.empty": "아직 메모가 없어요",
    "memo.write": "첫 번째 메모를 작성해보세요",
    "memo.cancel": "취소",
    "memo.save": "저장",
    "memo.edit": "수정",
    "memo.delete": "삭제",
    "memo.preview": "미리보기",
    "memo.placeholder.title": "메모 제목...",
    "memo.placeholder.content": "메모를 작성하세요... (마크다운 지원)",
    "note.label": "부모님을 위한 안내",
    "dashboard.milestone_progress": "발달 진행 상황",
    "dashboard.upcoming": "다음 발달 이정표",
    "dashboard.recent_memos": "최근 메모",
    "dashboard.view_all": "모두 보기",
    "source.label": "출처",
    "materials.label": "필요한 재료:",
    "action.label": "이렇게 해보세요:",
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
