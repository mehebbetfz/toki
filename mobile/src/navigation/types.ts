export type RootStackParamList = {
  MainTabs: undefined;
  Chat: { otherUserId: string; otherName: string };
  Call: { targetUserId: string; targetName: string; mode: 'audio' | 'video' };
};

export type MainTabParamList = {
  Map: undefined;
  Nearby: undefined;
  Conversations: undefined;
  Gifts: undefined;
  Profile: undefined;
};
