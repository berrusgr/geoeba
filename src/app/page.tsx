'use client';

import React from 'react';
import { useCurriculum } from '@/state/CurriculumContext';
import { WelcomeScreen } from '@/components/navigation/WelcomeScreen';
import { TeachingPortal } from '@/components/navigation/TeachingPortal';
import { GradeSelector } from '@/components/navigation/GradeSelector';
import { TopicSelector } from '@/components/navigation/TopicSelector';
import { MissionView } from '@/components/workspace/MissionView';
import { WorkspaceView } from '@/components/workspace/WorkspaceView';

export default function HomePage() {
  const { currentScreen } = useCurriculum();

  switch (currentScreen) {
    case 'home':
      return <WelcomeScreen />;
    case 'portal':
      return <TeachingPortal />;
    case 'grades':
      return <GradeSelector />;
    case 'topics':
      return <TopicSelector />;
    case 'mission':
      return <MissionView />;
    case 'workspace':
      return <WorkspaceView />;
    default:
      return <WelcomeScreen />;
  }
}
