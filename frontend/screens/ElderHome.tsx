import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Dimensions,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Feather from 'react-native-vector-icons/Feather';

type ElderHomeNavProp = StackNavigationProp<RootStackParamList, 'ElderHome'>;

const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  cream: '#FFFCEC',
  textDark: '#111',
  textMid: '#333',
  green: '#A6CFA1',
  lightred: '#D67C78',
  red: '#FF4C4C',
};

type MedCard = {
  id: string;
  period: string;     // 早上 / 中午 / 晚上 / 睡前
  time: string;       // 8:00
  meds: string[];     // 藥品清單
};

const { width } = Dimensions.get('window');
const CARD_W = Math.min(width * 0.86, 360);

export default function ElderHome() {
  const navigation = useNavigation<ElderHomeNavProp>();

  // 示例資料（你之後可換成後端回傳）
  const medCards: MedCard[] = [
    { id: '1', period: '早上', time: '08:00', meds: ['降壓藥 A', '保健品 B'] },
    { id: '2', period: '中午', time: '12:30', meds: ['胃藥 C'] },
    { id: '3', period: '晚上', time: '18:30', meds: ['降脂藥 D', '鈣片 E'] },
    { id: '4', period: '睡前', time: '22:00', meds: ['助眠藥 F'] },
  ];

  const [showMedModal, setShowMedModal] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatRef = useRef<FlatList<MedCard>>(null);

  const openMedModal = (startIndex = 0) => {
    setCurrentIndex(startIndex);
    setShowMedModal(true);
    // 小延遲確保 FlatList 已渲染後再捲動
    requestAnimationFrame(() => {
      flatRef.current?.scrollToIndex({ index: startIndex, animated: false });
    });
  };

  const closeMedModal = () => setShowMedModal(false);

  const goPrev = () => {
    if (currentIndex > 0) {
      const idx = currentIndex - 1;
      setCurrentIndex(idx);
      flatRef.current?.scrollToIndex({ index: idx, animated: true });
    }
  };

  const goNext = () => {
    if (currentIndex < medCards.length - 1) {
      const idx = currentIndex + 1;
      setCurrentIndex(idx);
      flatRef.current?.scrollToIndex({ index: idx, animated: true });
    }
  };

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

          {/* 吃藥提醒（改為開啟浮層，不跳頁） */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => openMedModal(0)}
            style={[styles.rowCard, styles.cardShadow, { backgroundColor: COLORS.green }]}
          >
            <View style={styles.rowTop}>
              <Text style={[styles.rowTitle, { color: COLORS.white }]}>吃藥提醒</Text>
              <MaterialIcons name="medication" size={30} color={COLORS.black} />
            </View>
            <View style={[styles.noteBox, { backgroundColor: '#E9F4E4' }]}>
              <Text style={styles.notePlaceholder}>
                早上 8:00{'\n'}保健品
              </Text>
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

        {/* 中央卡片區域（阻止事件穿透） */}
        <View style={styles.modalCenter} pointerEvents="box-none">
          <View style={styles.modalCardWrap}>
            {/* 關閉按鈕 */}
            <TouchableOpacity style={styles.closeBtn} onPress={closeMedModal} activeOpacity={0.9}>
              <Feather name="x" size={22} color={COLORS.black} />
            </TouchableOpacity>

            {/* 上一頁 / 下一頁 */}
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
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / (CARD_W + 24));
                setCurrentIndex(Math.max(0, Math.min(idx, medCards.length - 1)));
              }}
              contentContainerStyle={{ paddingHorizontal: 12 }}
              renderItem={({ item }) => (
                <View style={[styles.medCard, styles.cardShadow]}>
                  <View style={styles.medHeader}>
                    <Text style={styles.medPeriod}>{item.period}</Text>
                    <Text style={styles.medTime}>{item.time}</Text>
                  </View>

                  <View style={styles.medList}>
                    {item.meds.map((m, i) => (
                      <View key={i} style={styles.medPill}>
                        <MaterialIcons name="medication" size={18} color={COLORS.black} />
                        <Text style={styles.medPillText}>{m}</Text>
                      </View>
                    ))}
                  </View>

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
    width: CARD_W + 24, // 包含左右 padding
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
  medList: { gap: 10, marginTop: 6, marginBottom: 18 },
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
});
