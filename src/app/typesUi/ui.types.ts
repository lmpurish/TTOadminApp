import { AppSettings } from '../config';

export type UiPersisted = Pick<AppSettings,
  'theme' | 'activeTheme' | 'horizontal' | 'cardBorder' | 'boxed'
>;