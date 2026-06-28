import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { PlanetAngleViewer } from '../components/PlanetAngleViewer';
import { DREAM_PLANET_OPTIONS, getDreamPlanetOption } from '../data/dreamPlanets';
import type { SavedDream } from '../types/record';
import { getSavedDreams } from '../utils/dreamStorage';

const archiveSpaceBg = require('../../assets/record/archive-space-bg.png');

type Props = { active?: boolean; refreshTrigger?: number; onBack?: () => void };

export function PlanetSceneScreen({ active = false, refreshTrigger = 0, onBack }: Props) {
  const { width } = useWindowDimensions();
  const [dreams, setDreams] = useState<SavedDream[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const float = useRef(new Animated.Value(0)).current;
  const hero = DREAM_PLANET_OPTIONS[0];
  const heroSources = hero.angleSources ?? [hero.source];

  useEffect(() => {
    if (!active) return;
    void getSavedDreams().then((items) => {
      const collected = items.filter((item) => item.mode === 'planet');
      setDreams(collected);
      setSelectedId((current) => current && collected.some((item) => item.id === current) ? current : collected[0]?.id ?? null);
    });
  }, [active, refreshTrigger]);

  useEffect(() => {
    if (!active) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [active, float]);

  const selected = useMemo(() => dreams.find((item) => item.id === selectedId) ?? dreams[0] ?? null, [dreams, selectedId]);
  const selectedOption = selected ? getDreamPlanetOption(selected.planetId) : hero;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable onPress={onBack} style={styles.back}><Text style={styles.backText}>‹</Text></Pressable>
          <View style={styles.headerCopy}><Text style={styles.eyebrow}>MY DREAM UNIVERSE</Text><Text style={styles.title}>행성 아쿠아리움</Text></View>
          <View style={styles.count}><Text style={styles.countText}>{dreams.length}개 수집</Text></View>
        </View>

        <View style={[styles.heroCard, { width: Math.min(width - 32, 393) }]}>
          <Image source={archiveSpaceBg} style={styles.heroBackground} resizeMode="cover" />
          <Text style={styles.heroKicker}>대표 3D 행성 · 10 ANGLES</Text>
          <Text style={styles.heroTitle}>라일락 궤도</Text>
          <Animated.View style={[styles.viewerWrap, { transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [-5, 7] }) }] }]}>
            <PlanetAngleViewer sources={heroSources} style={styles.viewer} />
          </Animated.View>
          <Text style={styles.dragHint}>행성을 좌우로 드래그해 각도를 바꿔보세요</Text>
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.detailLabel}>선택한 꿈</Text>
          <Text numberOfLines={1} style={styles.detailTitle}>{selected?.title ?? '아직 수집된 행성이 없어요'}</Text>
          <Text style={styles.detailBody}>{selected ? `${selected.date.replaceAll('-', '.')} · ${selectedOption.label}` : '첫 꿈을 행성 모드로 기록하면 이곳에 수집됩니다.'}</Text>
        </View>

        <View style={styles.collectionHeader}><Text style={styles.collectionTitle}>수집한 꿈 행성</Text><Text style={styles.collectionHint}>탭하여 선택</Text></View>
        <View style={styles.grid}>
          {dreams.map((dream) => {
            const option = getDreamPlanetOption(dream.planetId);
            const isSelected = selected?.id === dream.id;
            return <Pressable key={dream.id} onPress={() => setSelectedId(dream.id)} style={[styles.cell, isSelected && styles.cellSelected]}>
              <Image source={option.source} style={styles.cellImage} resizeMode="contain" />
              <Text numberOfLines={1} style={[styles.cellTitle, isSelected && styles.cellTitleSelected]}>{dream.title}</Text>
              <Text style={styles.cellDate}>{dream.date.slice(5).replace('-', '.')}</Text>
            </Pressable>;
          })}
          {!dreams.length && <View style={styles.empty}><Text style={styles.emptyTitle}>첫 행성을 기다리고 있어요</Text><Text style={styles.emptyBody}>꿈 기록에서 행성 모드를 선택해 보세요.</Text></View>}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FBFAFF' },
  content: { alignItems: 'center', paddingTop: Platform.select({ ios: 62, default: 32 }), paddingBottom: 150 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingHorizontal: 20, width: '100%' },
  back: { alignItems: 'center', backgroundColor: '#F0ECFA', borderRadius: 18, height: 40, justifyContent: 'center', width: 40 },
  backText: { color: '#413456', fontFamily: 'Pretendard-SemiBold', fontSize: 34, lineHeight: 36, marginTop: -4 },
  headerCopy: { flex: 1 },
  eyebrow: { color: '#8A78B0', fontFamily: 'Pretendard-SemiBold', fontSize: 10, letterSpacing: 1 },
  title: { color: '#251B35', fontFamily: 'Cafe24SsurroundAir', fontSize: 25, marginTop: 3 },
  count: { backgroundColor: '#EEE8FF', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 7 },
  countText: { color: '#7356A6', fontFamily: 'Pretendard-SemiBold', fontSize: 12 },
  heroCard: { backgroundColor: '#2D1E4A', borderRadius: 30, height: 400, marginTop: 24, overflow: 'hidden', paddingHorizontal: 22, paddingTop: 24 },
  heroBackground: { ...StyleSheet.absoluteFillObject, height: '100%', opacity: 0.92, width: '100%' },
  heroKicker: { color: '#D8C9FF', fontFamily: 'Pretendard-SemiBold', fontSize: 12 },
  heroTitle: { color: '#FFFFFF', fontFamily: 'Cafe24SsurroundAir', fontSize: 22, marginTop: 5 },
  viewerWrap: { alignSelf: 'center', height: 272, marginTop: 8, width: 330 },
  viewer: { height: '100%', width: '100%' },
  dragHint: { alignSelf: 'center', color: '#E2D9FC', fontFamily: 'Pretendard-Medium', fontSize: 12 },
  detailCard: { alignSelf: 'stretch', backgroundColor: '#FFFFFF', borderColor: '#EEEAF5', borderRadius: 22, borderWidth: 1, marginHorizontal: 16, marginTop: 18, paddingHorizontal: 19, paddingVertical: 17 },
  detailLabel: { color: '#998BAD', fontFamily: 'Pretendard-Medium', fontSize: 12 },
  detailTitle: { color: '#2D2539', fontFamily: 'Pretendard-SemiBold', fontSize: 17, marginTop: 6 },
  detailBody: { color: '#83778F', fontFamily: 'Pretendard-Regular', fontSize: 13, marginTop: 5 },
  collectionHeader: { alignItems: 'baseline', alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 20, marginTop: 28 },
  collectionTitle: { color: '#332641', fontFamily: 'Pretendard-SemiBold', fontSize: 18 },
  collectionHint: { color: '#9B90A6', fontFamily: 'Pretendard-Regular', fontSize: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginHorizontal: 16, marginTop: 15 },
  cell: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#F0EDF6', borderRadius: 19, borderWidth: 1, paddingBottom: 13, paddingTop: 10, width: 108 },
  cellSelected: { borderColor: '#B89AFA', borderWidth: 1.5 },
  cellImage: { height: 68, width: 92 },
  cellTitle: { color: '#5D5267', fontFamily: 'Pretendard-Medium', fontSize: 11, marginTop: 3, maxWidth: 88 },
  cellTitleSelected: { color: '#6C45A5', fontFamily: 'Pretendard-SemiBold' },
  cellDate: { color: '#AAA0B3', fontFamily: 'Pretendard-Regular', fontSize: 10, marginTop: 3 },
  empty: { alignItems: 'center', backgroundColor: '#F4F1F9', borderRadius: 20, paddingHorizontal: 28, paddingVertical: 30, width: '100%' },
  emptyTitle: { color: '#5D506B', fontFamily: 'Pretendard-SemiBold', fontSize: 15 },
  emptyBody: { color: '#938899', fontFamily: 'Pretendard-Regular', fontSize: 13, marginTop: 7 },
});
