'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { LevelId, GradeId, Topic, Activity, Level, Grade, MathCategory } from '@/types/curriculum';
import { curriculumData } from '@/curriculum/curriculumData';

export type AppScreen = 'home' | 'portal' | 'grades' | 'topics' | 'mission' | 'workspace';

interface HistoryNavState {
  screen: AppScreen;
  levelId: LevelId | null;
  gradeNumber: GradeId | null;
  topicId: string | null;
  activityId: string | null;
  isFreeSandbox: boolean;
}

interface CurriculumContextType {
  currentScreen: AppScreen;
  selectedLevel: Level | null;
  selectedGrade: Grade | null;
  selectedTopic: Topic | null;
  selectedActivity: Activity | null;
  selectedCategory: MathCategory;
  isFreeSandbox: boolean;
  searchQuery: string;

  // İlerleme ve Tamamlanan Etkinlikler
  completedActivityIds: string[];
  markActivityCompleted: (activityId: string) => void;

  // Navigasyon eylemleri
  selectLevel: (levelId: LevelId) => void;
  selectGrade: (gradeNumber: GradeId) => void;
  selectTopic: (topicId: string) => void;
  selectActivity: (activity: Activity, openAsMission?: boolean) => void;
  activeModalTopic: Topic | null;
  setActiveModalTopic: (topic: Topic | null) => void;
  setSelectedCategory: (category: MathCategory) => void;
  setSearchQuery: (query: string) => void;
  startFreeSandbox: () => void;
  openMissionMode: (activity: Activity) => void;
  openStudioMode: () => void;
  goBack: () => void;
  goHome: () => void;
  setScreen: (screen: AppScreen) => void;
}

const CurriculumContext = createContext<CurriculumContextType | undefined>(undefined);

const PROGRESS_STORAGE_KEY = 'matematik_tamamlanan_etkinlikler_v3';

// Yardımcı: ID'ye göre etkinliği arama
function findActivityById(activityId: string): Activity | null {
  for (const levelKey of Object.keys(curriculumData.levels) as LevelId[]) {
    const level = curriculumData.levels[levelKey];
    for (const grade of level.grades) {
      for (const topic of grade.topics || []) {
        const found = topic.activities.find((a) => a.id === activityId);
        if (found) return found;
      }
      for (const theme of grade.themes || []) {
        for (const topic of theme.topics || []) {
          const found = topic.activities.find((a) => a.id === activityId);
          if (found) return found;
        }
      }
    }
  }
  return null;
}

// Yardımcı: Etkinlik ID'sine göre ait olduğu konuyu bulma
function findTopicByActivityId(activityId: string): Topic | null {
  for (const levelKey of Object.keys(curriculumData.levels) as LevelId[]) {
    const level = curriculumData.levels[levelKey];
    for (const grade of level.grades) {
      for (const topic of grade.topics || []) {
        if (topic.activities.some((a) => a.id === activityId)) return topic;
      }
      for (const theme of grade.themes || []) {
        for (const topic of theme.topics || []) {
          if (topic.activities.some((a) => a.id === activityId)) return topic;
        }
      }
    }
  }
  return null;
}

export function CurriculumProvider({ children }: { children: React.ReactNode }) {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>('home');
  const [selectedLevelId, setSelectedLevelId] = useState<LevelId | null>(null);
  const [selectedGradeNumber, setSelectedGradeNumber] = useState<GradeId | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [activeModalTopic, setActiveModalTopic] = useState<Topic | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<MathCategory>('hepsi');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFreeSandbox, setIsFreeSandbox] = useState<boolean>(false);
  const [completedActivityIds, setCompletedActivityIds] = useState<string[]>([]);

  const isPopStateRef = useRef(false);

  const selectedLevel = selectedLevelId ? curriculumData.levels[selectedLevelId] : null;
  const effectiveGradeNumber =
    selectedGradeNumber ||
    (selectedLevelId === 'ilkokul' ? 1 : selectedLevelId === 'lise' ? 9 : 5);
  const selectedGrade =
    selectedLevel
      ? selectedLevel.grades.find((g) => g.gradeNumber === effectiveGradeNumber) || selectedLevel.grades[0]
      : null;

  const selectedTopic =
    selectedGrade && selectedTopicId
      ? selectedGrade.topics.find((t) => t.id === selectedTopicId) ||
        selectedGrade.themes.flatMap((th) => th.topics).find((t) => t.id === selectedTopicId) ||
        null
      : null;

  // LocalStorage'dan kayıtlı ilerlemeyi yükleme
  useEffect(() => {
    try {
      const savedProgress = localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (savedProgress) {
        const parsed = JSON.parse(savedProgress);
        if (Array.isArray(parsed)) setCompletedActivityIds(parsed);
      }
    } catch (e) {}
  }, []);

  // Tarayıcı Geçmişi (Browser Back / Forward) Senkronizasyonu
  const pushBrowserHistory = useCallback((navState: HistoryNavState) => {
    if (typeof window === 'undefined' || isPopStateRef.current) return;

    let urlHash = '#/';
    if (navState.screen === 'home') urlHash = '#/home';
    else if (navState.screen === 'grades' && navState.levelId) urlHash = `#/kademe/${navState.levelId}`;
    else if (navState.screen === 'portal' && navState.levelId && navState.gradeNumber) urlHash = `#/sinif/${navState.gradeNumber}`;
    else if (navState.screen === 'mission' && navState.activityId) urlHash = `#/gorev/${navState.activityId}`;
    else if (navState.screen === 'workspace' && navState.isFreeSandbox) urlHash = '#/studyo';
    else if (navState.screen === 'workspace' && navState.activityId) urlHash = `#/calisma/${navState.activityId}`;

    try {
      window.history.pushState(navState, '', urlHash);
    } catch (e) {}
  }, []);

  // Popstate Olayını Dinleme (Tarayıcı Geri/İleri Tuşuna Basıldığında)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // İlk sayfa yüklenişinde mevcut durumu kaydet
    if (!window.history.state || !window.history.state.screen) {
      window.history.replaceState(
        {
          screen: 'home',
          levelId: null,
          gradeNumber: null,
          topicId: null,
          activityId: null,
          isFreeSandbox: false,
        },
        '',
        '#/home'
      );
    }

    const handlePopState = (event: PopStateEvent) => {
      isPopStateRef.current = true;
      const state = event.state as HistoryNavState | null;

      if (state && state.screen) {
        setCurrentScreen(state.screen);
        setSelectedLevelId(state.levelId);
        setSelectedGradeNumber(state.gradeNumber);
        setSelectedTopicId(state.topicId);
        setIsFreeSandbox(state.isFreeSandbox || false);
        if (state.activityId) {
          const act = findActivityById(state.activityId);
          setSelectedActivity(act);
        } else {
          setSelectedActivity(null);
        }
      } else {
        // Durum yoksa ana sayfaya dön
        setCurrentScreen('home');
        setSelectedLevelId(null);
        setSelectedGradeNumber(null);
        setSelectedTopicId(null);
        setSelectedActivity(null);
        setIsFreeSandbox(false);
      }

      setTimeout(() => {
        isPopStateRef.current = false;
      }, 50);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const markActivityCompleted = (activityId: string) => {
    setCompletedActivityIds((prev) => {
      if (prev.includes(activityId)) return prev;
      const next = [...prev, activityId];
      try {
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
  };

  const selectLevel = (levelId: LevelId) => {
    stopSpeech();
    const defaultGrade = (levelId === 'ilkokul' ? 1 : levelId === 'lise' ? 9 : 5) as GradeId;
    setSelectedLevelId(levelId);
    setSelectedGradeNumber(defaultGrade);
    setSelectedTopicId(null);
    setSelectedActivity(null);
    setActiveModalTopic(null);
    setIsFreeSandbox(false);
    setCurrentScreen('grades');

    pushBrowserHistory({
      screen: 'grades',
      levelId,
      gradeNumber: defaultGrade,
      topicId: null,
      activityId: null,
      isFreeSandbox: false,
    });
  };

  const selectGrade = (gradeNumber: GradeId) => {
    stopSpeech();
    // Kademeyi de otomatik eşle
    if (gradeNumber <= 4) {
      setSelectedLevelId('ilkokul');
    } else if (gradeNumber >= 9) {
      setSelectedLevelId('lise');
    } else {
      setSelectedLevelId('ortaokul');
    }

    setSelectedGradeNumber(gradeNumber);
    setSelectedTopicId(null);
    setSelectedActivity(null);
    setActiveModalTopic(null);
    setIsFreeSandbox(false);
    setCurrentScreen('portal');

    const mappedLevelId = gradeNumber <= 4 ? 'ilkokul' : gradeNumber >= 9 ? 'lise' : 'ortaokul';

    pushBrowserHistory({
      screen: 'portal',
      levelId: mappedLevelId,
      gradeNumber,
      topicId: null,
      activityId: null,
      isFreeSandbox: false,
    });
  };

  const selectTopic = (topicId: string) => {
    stopSpeech();
    setSelectedTopicId(topicId);
    const foundTopic =
      selectedGrade?.themes.flatMap((th) => th.topics).find((t) => t.id === topicId) ||
      selectedGrade?.topics.find((t) => t.id === topicId);

    if (foundTopic && foundTopic.activities.length > 0) {
      selectActivity(foundTopic.activities[0], true);
    } else {
      setCurrentScreen('portal');
      pushBrowserHistory({
        screen: 'portal',
        levelId: selectedLevelId,
        gradeNumber: selectedGradeNumber,
        topicId,
        activityId: null,
        isFreeSandbox: false,
      });
    }
  };

  const selectActivity = (activity: Activity, openAsMission: boolean = true) => {
    stopSpeech();
    setSelectedActivity(activity);
    setIsFreeSandbox(false);

    // Eğer modal konusu hafızada yoksa ait olduğu konuyu otomatik bağla
    if (!activeModalTopic) {
      const parentTopic = findTopicByActivityId(activity.id);
      if (parentTopic) setActiveModalTopic(parentTopic);
    }

    const targetScreen: AppScreen = openAsMission ? 'mission' : 'workspace';
    setCurrentScreen(targetScreen);

    pushBrowserHistory({
      screen: targetScreen,
      levelId: selectedLevelId,
      gradeNumber: selectedGradeNumber,
      topicId: selectedTopicId,
      activityId: activity.id,
      isFreeSandbox: false,
    });
  };

  const startFreeSandbox = () => {
    stopSpeech();
    setIsFreeSandbox(true);
    setSelectedActivity(null);
    setCurrentScreen('workspace');

    pushBrowserHistory({
      screen: 'workspace',
      levelId: selectedLevelId,
      gradeNumber: selectedGradeNumber,
      topicId: null,
      activityId: null,
      isFreeSandbox: true,
    });
  };

  const openMissionMode = (activity: Activity) => {
    selectActivity(activity, true);
  };

  const openStudioMode = () => {
    stopSpeech();
    setCurrentScreen('workspace');
    pushBrowserHistory({
      screen: 'workspace',
      levelId: selectedLevelId,
      gradeNumber: selectedGradeNumber,
      topicId: selectedTopicId,
      activityId: selectedActivity?.id || null,
      isFreeSandbox,
    });
  };

  const goBack = () => {
    stopSpeech();
    if (currentScreen === 'workspace') {
      if (selectedActivity) {
        selectActivity(selectedActivity, true);
      } else {
        setCurrentScreen('portal');
      }
    } else if (currentScreen === 'mission') {
      // Görevden çıkıldığında doğrudan ait olduğu konunun Görevler Modalı'na dön
      if (!activeModalTopic && selectedActivity) {
        const parentTopic = findTopicByActivityId(selectedActivity.id);
        if (parentTopic) setActiveModalTopic(parentTopic);
      }
      setCurrentScreen('portal');
      pushBrowserHistory({
        screen: 'portal',
        levelId: selectedLevelId,
        gradeNumber: selectedGradeNumber,
        topicId: selectedTopicId,
        activityId: null,
        isFreeSandbox: false,
      });
    } else if (currentScreen === 'portal') {
      if (activeModalTopic) {
        setActiveModalTopic(null);
      } else {
        setCurrentScreen('grades');
        pushBrowserHistory({
          screen: 'grades',
          levelId: selectedLevelId,
          gradeNumber: selectedGradeNumber,
          topicId: null,
          activityId: null,
          isFreeSandbox: false,
        });
      }
    } else if (currentScreen === 'grades') {
      setCurrentScreen('home');
      pushBrowserHistory({
        screen: 'home',
        levelId: null,
        gradeNumber: null,
        topicId: null,
        activityId: null,
        isFreeSandbox: false,
      });
    } else {
      setCurrentScreen('home');
    }
  };

  const goHome = () => {
    stopSpeech();
    setCurrentScreen('home');
    setSelectedTopicId(null);
    setSelectedActivity(null);
    setActiveModalTopic(null);
    setIsFreeSandbox(false);

    pushBrowserHistory({
      screen: 'home',
      levelId: null,
      gradeNumber: null,
      topicId: null,
      activityId: null,
      isFreeSandbox: false,
    });
  };

  const setScreen = (screen: AppScreen) => {
    setCurrentScreen(screen);
    pushBrowserHistory({
      screen,
      levelId: selectedLevelId,
      gradeNumber: selectedGradeNumber,
      topicId: selectedTopicId,
      activityId: selectedActivity?.id || null,
      isFreeSandbox,
    });
  };

  return (
    <CurriculumContext.Provider
      value={{
        currentScreen,
        selectedLevel,
        selectedGrade,
        selectedTopic,
        selectedActivity,
        activeModalTopic,
        setActiveModalTopic,
        selectedCategory,
        isFreeSandbox,
        searchQuery,
        completedActivityIds,
        markActivityCompleted,
        selectLevel,
        selectGrade,
        selectTopic,
        selectActivity,
        setSelectedCategory,
        setSearchQuery,
        startFreeSandbox,
        openMissionMode,
        openStudioMode,
        goBack,
        goHome,
        setScreen,
      }}
    >
      {children}
    </CurriculumContext.Provider>
  );
}

export function useCurriculum() {
  const context = useContext(CurriculumContext);
  if (!context) {
    throw new Error('useCurriculum must be used within a CurriculumProvider');
  }
  return context;
}
