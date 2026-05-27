import { Text, View } from 'react-native';

import type { FamilyMember } from '@/features/family/hooks';

interface FamilyMembersListProps {
  members: FamilyMember[];
  currentEmail: string | null;
}

export function FamilyMembersList({ members, currentEmail }: FamilyMembersListProps) {
  return (
    <View className="gap-2">
      {members.map((member) => (
        <MemberRow key={member.id} member={member} currentEmail={currentEmail} />
      ))}
    </View>
  );
}

interface MemberRowProps {
  member: FamilyMember;
  currentEmail: string | null;
}

function MemberRow({ member, currentEmail }: MemberRowProps) {
  const label = member.isCurrentUser ? (currentEmail ?? 'Ty') : 'Czlonek rodziny';
  const roleLabel = member.role === 'owner' ? 'Wlasciciel' : 'Czlonek';

  return (
    <View className="flex-row items-center justify-between rounded-xl bg-cream px-3 py-2 dark:bg-dark-surface">
      <View className="flex-1">
        <Text className="text-sm font-medium text-navy dark:text-cream">{label}</Text>
        {member.isCurrentUser ? null : (
          <Text className="text-xs text-purple">id: {member.user_id.slice(0, 8)}…</Text>
        )}
      </View>
      <Text className="text-xs font-semibold text-purple">{roleLabel}</Text>
    </View>
  );
}
