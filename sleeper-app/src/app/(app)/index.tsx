import { Link } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActiveWindowCard } from '@/components/ActiveWindowCard';
import { BigActionButton } from '@/components/BigActionButton';
import { QuickActions } from '@/components/QuickActions';
import { SessionListItem } from '@/components/SessionListItem';
import { SleepInProgressCard } from '@/components/SleepInProgressCard';
import { TodayStatsCard } from '@/components/TodayStatsCard';
import { useAuth } from '@/features/auth/AuthProvider';
import { AddChildForm } from '@/features/children/components/AddChildForm';
import { useChildren } from '@/features/children/hooks';
import { useActiveChild } from '@/features/children/useActiveChild';
import {
  useAcceptInvitation,
  useCurrentFamily,
  useMyIncomingInvitations,
  type IncomingInvitation,
} from '@/features/family/hooks';
import { BackdatedSessionModal } from '@/features/sessions/components/BackdatedSessionModal';
import {
  useActiveSession,
  useEndSession,
  useLastEndedSession,
  useSessions,
  useStartSession,
} from '@/features/sessions/hooks';
import { extractErrorMessage } from '@/lib/extract-error-message';
import { endOfDayInAppTz, startOfDayInAppTz } from '@/lib/time';

const TICK_MS = 30 * 1000; // odswiez "now" co 30s dla agregatow / okna

export default function TodayScreen() {
  const { user } = useAuth();
  const familyQuery = useCurrentFamily();
  const incomingQuery = useMyIncomingInvitations();
  const acceptInvitation = useAcceptInvitation();

  const family = familyQuery.data;
  const familyId = family?.id ?? null;

  const childrenQuery = useChildren(familyId);
  // useMemo stabilizuje referencje pustej tablicy miedzy renderami —
  // bez tego useEffect/useMemo nizej widzialyby nowy `children` co render.
  const children = useMemo(() => childrenQuery.data ?? [], [childrenQuery.data]);

  const { activeChildId, setActiveChildId } = useActiveChild();

  // Jesli wybrane dziecko zniknelo lub nigdy nie bylo wybrane — wybierz pierwsze.
  useEffect(() => {
    if (children.length === 0) return;
    const stillExists = activeChildId && children.some((c) => c.id === activeChildId);
    if (!stillExists) {
      setActiveChildId(children[0].id);
    }
  }, [children, activeChildId, setActiveChildId]);

  const activeChild = useMemo(
    () => children.find((c) => c.id === activeChildId) ?? null,
    [children, activeChildId],
  );

  const incoming = incomingQuery.data ?? [];
  const hasNoFamily = !familyQuery.isLoading && !family;

  return (
    <SafeAreaView className="flex-1 bg-cream dark:bg-dark-bg">
      <ScrollView contentContainerClassName="px-6 py-6 gap-4">
        <View>
          <Text className="text-3xl font-semibold text-navy dark:text-cream">Dzisiaj</Text>
          {activeChild ? (
            <Text className="mt-1 text-base text-purple dark:text-cream/70">{activeChild.name}</Text>
          ) : (
            <Text className="mt-1 text-base text-purple dark:text-cream/70">
              Zalogowany: {user?.email ?? 'brak'}
            </Text>
          )}
        </View>

        {hasNoFamily ? <NoFamilyBanner /> : null}

        {incoming.length > 0 ? (
          <View className="rounded-2xl bg-orange/15 p-4">
            <Text className="text-sm font-semibold text-navy dark:text-cream">
              {incoming.length === 1 ? 'Masz zaproszenie' : `Masz ${incoming.length} zaproszen`}
            </Text>
            <Text className="mt-1 text-xs text-purple dark:text-cream/70">
              Aby dolaczyc do rodziny ktora Cie zaprosila, kliknij ponizej.
            </Text>
            <View className="mt-3 gap-2">
              {incoming.map((invitation) => (
                <InvitationRow
                  key={invitation.id}
                  invitation={invitation}
                  onAccept={() => acceptInvitation.mutate(invitation.id)}
                  isProcessing={
                    acceptInvitation.isPending &&
                    acceptInvitation.variables === invitation.id
                  }
                  errorMessage={
                    acceptInvitation.isError &&
                    acceptInvitation.variables === invitation.id &&
                    acceptInvitation.error instanceof Error
                      ? acceptInvitation.error.message
                      : null
                  }
                />
              ))}
            </View>
          </View>
        ) : null}

        {family && children.length === 0 && !childrenQuery.isLoading ? (
          <AddChildForm familyId={family.id} />
        ) : null}

        {activeChild ? <ActiveChildSection childId={activeChild.id} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

interface ActiveChildSectionProps {
  childId: string;
}

function ActiveChildSection({ childId }: ActiveChildSectionProps) {
  const [now, setNow] = useState<Date>(() => new Date());
  const [isBackdatedOpen, setBackdatedOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const startOfDay = useMemo(() => startOfDayInAppTz(now), [now]);
  // endOfDay = poczatek nastepnego dnia w app tz (uwzglednia DST, w odroznieniu
  // od start + 24h ktore dwa razy w roku przesuwa granice o godzine).
  const endOfDay = useMemo(() => endOfDayInAppTz(now), [now]);

  const activeSessionQuery = useActiveSession(childId);
  const lastEndedQuery = useLastEndedSession(childId);
  const todaySessionsQuery = useSessions(childId, startOfDay, endOfDay);

  const startSession = useStartSession();
  const endSession = useEndSession();

  const activeSession = activeSessionQuery.data ?? null;
  const lastEnded = lastEndedQuery.data ?? null;
  const todaySessions = todaySessionsQuery.data ?? [];

  function handleStart(type: 'nap' | 'night_sleep') {
    if (activeSession) return;
    startSession.mutate({ childId, type });
  }

  function handleStop() {
    if (!activeSession) return;
    endSession.mutate({ sessionId: activeSession.id, childId });
  }

  return (
    <>
      {activeSession ? (
        <SleepInProgressCard
          startAt={activeSession.start_at}
          type={activeSession.type}
        />
      ) : (
        <ActiveWindowCard
          lastSleepEndAt={lastEnded?.end_at ? new Date(lastEnded.end_at) : null}
        />
      )}

      <TodayStatsCard
        sessions={todaySessions}
        activeSession={activeSession}
        now={now}
        startOfDay={startOfDay}
      />

      <BigActionButton
        mode={activeSession ? 'stop' : 'start'}
        onPress={activeSession ? handleStop : () => handleStart('nap')}
        isPending={startSession.isPending || endSession.isPending}
      />

      <QuickActions
        onStartNap={() => handleStart('nap')}
        onStartNight={() => handleStart('night_sleep')}
        onAddBackdated={() => setBackdatedOpen(true)}
        disabled={Boolean(activeSession) || startSession.isPending}
      />

      {startSession.isError ? (
        <Text className="text-sm text-orange">
          Blad startu: {extractErrorMessage(startSession.error)}
        </Text>
      ) : null}
      {endSession.isError ? (
        <Text className="text-sm text-orange">
          Blad zakonczenia: {extractErrorMessage(endSession.error)}
        </Text>
      ) : null}

      {todaySessions.length > 0 ? (
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-semibold uppercase tracking-wide text-purple">
              Sesje dzisiaj
            </Text>
            <Link href="/history" className="text-xs font-semibold text-navy underline dark:text-cream">
              Pokaz wszystkie
            </Link>
          </View>
          {todaySessions.slice(0, 5).map((session) => (
            <SessionListItem key={session.id} session={session} />
          ))}
        </View>
      ) : null}

      <BackdatedSessionModal
        visible={isBackdatedOpen}
        childId={childId}
        onClose={() => setBackdatedOpen(false)}
      />
    </>
  );
}

function NoFamilyBanner() {
  return (
    <View className="rounded-2xl bg-orange/15 p-4">
      <Text className="text-sm font-semibold text-navy dark:text-cream">Nie nalezysz do rodziny</Text>
      <Text className="mt-1 text-xs text-purple dark:text-cream/70">
        Przejdz do profilu zeby stworzyc rodzine lub przyjac zaproszenie.
      </Text>
      <Link href="/profile" className="mt-3 text-sm font-semibold text-navy underline dark:text-cream">
        Przejdz do profilu
      </Link>
    </View>
  );
}

interface InvitationRowProps {
  invitation: IncomingInvitation;
  onAccept: () => void;
  isProcessing: boolean;
  errorMessage: string | null;
}

function InvitationRow({ invitation, onAccept, isProcessing, errorMessage }: InvitationRowProps) {
  return (
    <View>
      <View className="flex-row items-center justify-between rounded-xl bg-white px-3 py-2 dark:bg-dark-card">
        <View className="flex-1">
          <Text className="text-sm font-medium text-navy dark:text-cream">{invitation.family_name}</Text>
          <Text className="text-xs text-purple">na {invitation.email}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={isProcessing}
          onPress={onAccept}
          className={`items-center justify-center rounded-xl px-3 py-2 ${
            isProcessing ? 'bg-navy/40' : 'bg-navy'
          }`}>
          {isProcessing ? (
            <ActivityIndicator color="#F5F0E8" size="small" />
          ) : (
            <Text className="text-xs font-semibold text-cream">Dolacz</Text>
          )}
        </Pressable>
      </View>
      {errorMessage ? <Text className="mt-1 px-1 text-xs text-orange">{errorMessage}</Text> : null}
    </View>
  );
}
