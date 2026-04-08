export type RootStackParamList = {
  MainTabs: undefined;
  Chat: { otherUserId: string; otherName: string };
  Call: { targetUserId: string; targetName: string; mode: 'audio' | 'video' };
  /** JSON.stringify(ViewableUser) — полный профиль другого пользователя */
  UserProfile: { userJson: string };
};

export type MainTabParamList = {
  Map: undefined;
  Settings: undefined;
  Conversations: undefined;
  Gifts: undefined;
  Profile: undefined;
};
