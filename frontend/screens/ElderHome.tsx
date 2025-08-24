import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  Dimensions,
  StatusBar,
  ScrollView,
  Image,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';

const COLORS = { white: '#FFFFFF', black: '#111111', cream: '#FFFCEC', textDark: '#111', textMid: '#333', green: '#A6CFA1', lightred: '#D67C78', red: '#FF4C4C' };

const { width } = Dimensions.get('window');
const CARD_W = Math.min(width * 0.86, 360);
const SNAP = CARD_W + 24;

// 工具：補零
const pad = (n: number) => String(n).padStart(2, '0');

// 依「現在 HH:MM」從 medCards 中挑出『下一筆有藥』的索引（原陣列索引）
// 規則：先以 time 升冪排序（空 time 視為 '99:99' 放最後），找第一個 time >= 現在 且 有藥；找不到就取當天最早一筆有藥
const getNextPreviewIndex = (cards: Array<{ id: string; time?: string; meds?: string[] }>): number => {
  if (!cards || cards.length === 0) return -1;

  const now = new Date();
  const nowStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;

  const sorted = [...cards].sort(
    (a, b) => (a.time || '99:99').localeCompare(b.time || '99:99')
  );

  const hasMeds = (c: any) => Array.isArray(c.meds) && c.meds.length > 0;

  const idxInSorted =
    sorted.findIndex(c => (c.time && c.time >= nowStr) && hasMeds(c)) >= 0
      ? sorted.findIndex(c => (c.time && c.time >= nowStr) && hasMeds(c))
      : sorted.findIndex(hasMeds);

  if (idxInSorted < 0) return -1;

  const targetId = sorted[idxInSorted].id;
  return cards.findIndex(c => c.id === targetId);
};

export default function ElderHome() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'ElderHome'>>();
  const [medCards, setMedCards] = useState<any[]>([]);
  const [showMedModal, setShowMedModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatRef = useRef<FlatList<any>>(null);

  // 每 60 秒觸發重算（讓「下一筆」會自動更新）
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(x => x + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const openMedModal = (startIndex = 0) => {
    setCurrentIndex(startIndex);
    setShowMedModal(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        flatRef.current?.scrollToIndex({ index: startIndex, animated: false });
      });
    });
  };

  const closeMedModal = () => setShowMedModal(false);
  const goPrev = () => currentIndex > 0 && setCurrentIndex(i => i - 1);
  const goNext = () => currentIndex < medCards.length - 1 && setCurrentIndex(i => i + 1);

  useEffect(() => {
    if (!showMedModal) return;
    flatRef.current?.scrollToIndex({ index: currentIndex, animated: true });
  }, [currentIndex, showMedModal]);

  useEffect(() => {
    const fetchData = async () => {
      const token = await AsyncStorage.getItem('access');
      if (!token) return;
      try {
        const res = await axios.get('http://192.168.0.55:8000/api/get-med-reminders/', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const raw = res.data;
        const converted = Object.entries(raw)
          .map(([key, val]: any, idx) => ({
            id: String(idx + 1),
            period: key,
            time: val?.time ? String(val.time).slice(0, 5) : '',
            meds: Array.isArray(val?.meds) ? val.meds : [],
          }))
          .filter(card => card.time || card.meds.length > 0);

        setMedCards(converted);
      } catch (err) {
        console.log('❌ 藥物提醒資料抓取失敗:', err);
      }
    };

    fetchData();
  }, []);

  // 供 FlatList 快速定位
  const getItemLayout = (_: any, index: number) => ({
    length: SNAP,
    offset: SNAP * index,
    index,
  });

  // === 依現在時間挑出『下一筆有藥』作為預覽 ===
  const previewIndex = getNextPreviewIndex(medCards);
  const preview = previewIndex >= 0 ? medCards[previewIndex] : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.black} />

      {/* 上半：使用者列 */}
      <View style={styles.topArea}>
        <View style={styles.userCard}>
          <Image source={require('../img/elderlyhome/grandpa.png')} style={styles.userIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>爺爺</Text>
          </View>
        </View>
      </View>

      {/* 下半：白色圓角面板 */}
      <View style={styles.panel}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140 }}
          style={{ flex: 1 }}
        >
          {/* 看診提醒 */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.rowCard, styles.cardShadow, { backgroundColor: COLORS.red }]}
          >
            <View style={styles.rowTop}>
              <Text style={[styles.rowTitle, { color: COLORS.white }]}>看診提醒</Text>
              <FontAwesome name="hospital-o" size={28} color={COLORS.white} />
            </View>
            <View style={[styles.noteBox, { backgroundColor: COLORS.white }]}>
              <Text style={[styles.notePlaceholder, { color: COLORS.textMid }]}>
                早上8:00{'\n'}
                臺大醫院 · 鄭醫師
              </Text>
            </View>
          </TouchableOpacity>

          {/* 吃藥提醒（卡片內顯示「下一筆有藥」；點擊開浮層並跳到該卡） */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => openMedModal(previewIndex >= 0 ? previewIndex : 0)}
            style={[styles.rowCard, styles.cardShadow, { backgroundColor: COLORS.green }]}
          >
            <View style={styles.rowTop}>
              <Text style={[styles.rowTitle, { color: COLORS.white }]}>吃藥提醒</Text>
              <MaterialIcons name="medication" size={30} color={COLORS.black} />
            </View>

            <View style={[styles.noteBox, { backgroundColor: '#E9F4E4' }]}>
              {preview ? (
                <>
                  <Text style={styles.notePlaceholder}>
                    {preview.period} {preview.time || ''}
                  </Text>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
                    {preview.meds.slice(0, 3).map((m: string, i: number) => (
                      <View key={i} style={styles.miniPill}>
                        <MaterialIcons name="medication" size={16} color={COLORS.black} />
                        <Text style={styles.miniPillText}>{m}</Text>
                      </View>
                    ))}
                    {preview.meds.length > 3 && (
                      <View style={styles.miniPill}>
                        <Text style={[styles.miniPillText, { fontWeight: '900' }]}>
                          +{preview.meds.length - 3}
                        </Text>
                      </View>
                    )}
                  </View>
                </>
              ) : (
                <Text style={styles.notePlaceholder}>尚無資料</Text>
              )}
            </View>
          </TouchableOpacity>

          {/* 健康狀況 */}
          <View style={styles.topGrid}>
            <TouchableOpacity
              style={[styles.squareCard, styles.cardShadow, { backgroundColor: COLORS.cream }]}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('ElderlyHealth' as never)}
            >
              <Text style={[styles.squareTitle, { color: COLORS.black }]}>健康狀況</Text>
              <View style={styles.squareBottomRow}>
                <View style={[styles.iconCircle, { backgroundColor: COLORS.black }]}>
                  <MaterialIcons name="favorite" size={25} color={COLORS.lightred} />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* 底部置中拍照 FAB */}
        <View pointerEvents="box-none" style={styles.fabWrap}>
          <TouchableOpacity
            style={styles.fab}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('ElderlyUpload' as never)}
          >
            <Feather name="camera" size={38} color={COLORS.white} />
            <Text style={styles.fabText}>拍照</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ====== 吃藥提醒浮層（可左右滑動） ====== */}
      <Modal
        visible={showMedModal}
        transparent
        animationType="fade"
        onRequestClose={closeMedModal}
      >
        {/* 半透明暗背景，點擊可關閉 */}
        <TouchableWithoutFeedback onPress={closeMedModal}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        {/* 中央卡片區域 */}
        <View style={styles.modalCenter} pointerEvents="box-none">
          <View style={styles.modalCardWrap}>
            {/* 關閉按鈕 */}
            <TouchableOpacity style={styles.closeBtn} onPress={closeMedModal} activeOpacity={0.9}>
              <Feather name="x" size={22} color={COLORS.black} />
            </TouchableOpacity>

            {/* 上/下一頁箭頭 */}
            <TouchableOpacity
              onPress={goPrev}
              style={[styles.navArrow, { left: -12, opacity: currentIndex === 0 ? 0.3 : 1 }]}
              disabled={currentIndex === 0}
              activeOpacity={0.8}
            >
              <Feather name="chevron-left" size={28} color={COLORS.black} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={goNext}
              style={[
                styles.navArrow,
                { right: -12, opacity: currentIndex === medCards.length - 1 ? 0.3 : 1 },
              ]}
              disabled={currentIndex === medCards.length - 1}
              activeOpacity={0.8}
            >
              <Feather name="chevron-right" size={28} color={COLORS.black} />
            </TouchableOpacity>

            {/* 可滑動卡片 */}
            <FlatList
              ref={flatRef}
              data={medCards}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled={false}
              snapToInterval={SNAP}
              decelerationRate="fast"
              snapToAlignment="start"
              showsHorizontalScrollIndicator={false}
              getItemLayout={getItemLayout}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SNAP);
                setCurrentIndex(Math.max(0, Math.min(idx, medCards.length - 1)));
              }}
              contentContainerStyle={{ paddingHorizontal: 12 }}
              renderItem={({ item }) => (
                <View style={[styles.medCard, styles.cardShadow]}>
                  <View style={styles.medHeader}>
                    <Text style={styles.medPeriod}>{item.period}</Text>
                    <Text style={styles.medTime}>{item.time}</Text>
                  </View>

                  {/* 卡片內垂直滾動的藥品清單 */}
                  <ScrollView style={styles.medScroll} contentContainerStyle={styles.medList}>
                    {item.meds.map((m, i) => (
                      <View key={i} style={styles.medPill}>
                        <MaterialIcons name="medication" size={18} color={COLORS.black} />
                        <Text style={styles.medPillText}>{m}</Text>
                      </View>
                    ))}
                    {item.meds.length === 0 && (
                      <Text style={{ fontSize: 16, color: COLORS.textMid }}>此時段沒有藥物</Text>
                    )}
                  </ScrollView>

                  <TouchableOpacity style={styles.okBtn} onPress={closeMedModal} activeOpacity={0.9}>
                    <Text style={styles.okBtnText}>知道了</Text>
                  </TouchableOpacity>
                </View>
              )}
            />

            {/* 指示點 */}
            <View style={styles.dots}>
              {medCards.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { opacity: i === currentIndex ? 1 : 0.35, width: i === currentIndex ? 16 : 8 },
                  ]}
                />
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const IMAGE_SIZE = 80;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.black },
  topArea: { paddingTop: 20, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: COLORS.black },
  userCard: {
    backgroundColor: COLORS.black,
    borderRadius: 20,
    paddingHorizontal: 4,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  userIcon: { width: IMAGE_SIZE, height: IMAGE_SIZE, borderRadius: IMAGE_SIZE / 2 },
  userName: { color: COLORS.white, fontSize: 35, fontWeight: '900' },
  panel: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  topGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  squareCard: {
    flex: 1,
    borderRadius: 20,
    padding: 18,
    height: 140,
    justifyContent: 'space-between',
  },
  squareTitle: { fontSize: 30, fontWeight: '900' },
  squareBottomRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  iconCircle: {
    width: 50, height: 50, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  rowCard: {
    borderRadius: 18,
    padding: 14,
    minHeight: 108,
    marginBottom: 12,
  },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowTitle: { fontSize: 30, fontWeight: '900', color: COLORS.textDark },
  noteBox: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  notePlaceholder: { fontSize: 30, fontWeight: '800', color: COLORS.textMid },
  fabWrap: {
    position: 'absolute',
    left: 0, right: 0,
    bottom: 10,
    alignItems: 'center',
  },
  fab: {
    width: 115, height: 115, borderRadius: 65,
    backgroundColor: COLORS.black,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.8,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
  },
  fabText: { color: COLORS.white, fontSize: 25, fontWeight: '900', marginTop: 6 },

  /* ===== Modal styles ===== */
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  modalCenter: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  modalCardWrap: {
    width: CARD_W + 24,
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    zIndex: 10,
    backgroundColor: '#F2F2F2',
    borderRadius: 18,
    padding: 8,
    elevation: 3,
  },
  navArrow: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -16 }],
    zIndex: 5,
    backgroundColor: '#F6F6F6',
    borderRadius: 999,
    padding: 6,
    elevation: 2,
  },
  medCard: {
    width: CARD_W,
    marginHorizontal: 12,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 18,
  },
  medHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 10,
  },
  medPeriod: { fontSize: 29, fontWeight: '900', color: COLORS.black },
  medTime: { fontSize: 25, fontWeight: '900', color: COLORS.textMid },
  medScroll: { maxHeight: 260 }, // 卡片內可滾動區域
  medList: { gap: 10, paddingBottom: 4 },
  medPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F7F9FB',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  medPillText: { fontSize: 25, fontWeight: '700', color: COLORS.textDark },
  okBtn: {
    marginTop: 4,
    backgroundColor: COLORS.black,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  okBtnText: { color: COLORS.white, fontSize: 18, fontWeight: '800' },
  dots: { flexDirection: 'row', gap: 6, marginTop: 12, justifyContent: 'center' },
  dot: { height: 8, borderRadius: 999, backgroundColor: COLORS.black },

  // 吃藥提醒卡片裡的小藥丸（預覽）
  miniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F7F9FB',
    marginRight: 8,
    marginBottom: 8,
  },
  miniPillText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginLeft: 6,
  },
});
