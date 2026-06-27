import { Platform, ViewStyle } from 'react-native';

export const shadows = {
  card: {
    ...Platform.select({
      web: {
        boxShadow:
          '0px 10px 24px rgba(139,125,255,0.12), inset 0px 2px 4px rgba(139,125,255,0.07)',
      } as ViewStyle,
      default: {
        shadowColor: '#8B7DFF',
        shadowOffset: { height: 10, width: 0 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 5,
      } as ViewStyle,
    }),
  } as ViewStyle,
  buttonPrimary: {
    shadowColor: '#907eff',
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  } as ViewStyle,
  buttonSecondary: {
    shadowColor: '#a69aff',
    shadowOffset: { height: 3, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  } as ViewStyle,
};

export type ShadowsType = typeof shadows;
