import { create } from 'zustand';

export interface ProfileField { key: string; label: string; value: string; visible: boolean; }

const DEFAULT_FIELDS: ProfileField[] = [
  { key: 'age',          label: 'Возраст',     value: '25',          visible: true  },
  { key: 'city',         label: 'Город',       value: 'Баку',        visible: true  },
  { key: 'occupation',   label: 'Работа',      value: 'Разработчик', visible: true  },
  { key: 'education',    label: 'Образование', value: 'БГТУ',        visible: false },
  { key: 'languages',    label: 'Языки',       value: 'RU, EN, AZ',  visible: true  },
  { key: 'relationship', label: 'Статус',      value: 'Свободен',    visible: false },
];

interface State {
  fields: ProfileField[];
  showGifts: boolean;
  showFavCount: boolean;
  hideOnline: boolean;
  setFields: (fn: (prev: ProfileField[]) => ProfileField[]) => void;
  setShowGifts: (v: boolean) => void;
  setShowFavCount: (v: boolean) => void;
  setHideOnline: (v: boolean) => void;
}

export const useProfileSettingsStore = create<State>((set) => ({
  fields: DEFAULT_FIELDS,
  showGifts: true,
  showFavCount: true,
  hideOnline: false,

  setFields: fn => set(s => ({ fields: fn(s.fields) })),
  setShowGifts: showGifts => set({ showGifts }),
  setShowFavCount: showFavCount => set({ showFavCount }),
  setHideOnline: hideOnline => set({ hideOnline }),
}));
