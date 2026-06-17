import { ViewStyle } from 'react-native';

export const shadows = {
  card: {
    shadowColor: '#6f4be8',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 5,
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
