import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

import FontAwesome from '@react-native-vector-icons/fontawesome';
import MaterialIcons from '@react-native-vector-icons/material-icons';
import Feather from '@react-native-vector-icons/feather';


type ElderHomeNavProp = StackNavigationProp<RootStackParamList, 'ElderHome'>;

const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  cream: '#FFFCEC',
  textDark: '#111',
  textMid: '#333',
  green: '#A6CFA1',
};

export default function ElderHome() {
  const navigation = useNavigation<ElderHomeNavProp>();

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
          contentContainerStyle={{ paddingBottom: 24 }}
          style={{ flex: 1 }}
        >
          {/* 上方兩個方卡 */}
          <View style={styles.topGrid}>
            {/* 黑：健康狀況 */}
            <TouchableOpacity
              style={[styles.squareCard, styles.cardShadow, { backgroundColor: COLORS.black }]}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('ElderlyHealth' as never)}
            >
              <Text style={[styles.squareTitle, { color: COLORS.white }]}>健康狀況</Text>
              <View style={styles.squareBottomRow}>
                <View style={[styles.iconCircle, { backgroundColor: COLORS.green }]}>
                  <MaterialIcons name="favorite" size={25} color={COLORS.black} />
                </View>
              </View>
            </TouchableOpacity>

            {/* 奶油黃：拍照 */}
            <TouchableOpacity
              style={[styles.squareCard, styles.cardShadow, { backgroundColor: COLORS.cream }]}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('ElderlyUpload' as never)}
            >
              <Text style={[styles.squareTitle, { color: COLORS.textDark }]}>拍照</Text>
              <View style={styles.squareBottomRow}>
                <View style={[styles.iconCircle, { backgroundColor: '#E6F3E0' }]}>
                  <Feather name="camera" size={25} color={COLORS.textDark} />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {/* 吃藥提醒 */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('ElderMedRemind' as never)}
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

          {/* 看診提醒 */}
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.rowCard, styles.cardShadow, { backgroundColor: COLORS.black }]}
          >
            <View style={styles.rowTop}>
              <Text style={[styles.rowTitle, { color: COLORS.white }]}>看診提醒</Text>
              <FontAwesome name="hospital-o" size={28} color={COLORS.white} />
            </View>
            <View style={[styles.noteBox, { backgroundColor: COLORS.white }]}>
              <Text style={[styles.notePlaceholder, { color: COLORS.textMid }]}>
                臺大醫院{'\n'}鄭醫師
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>
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
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  topGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  squareCard: {
    flex: 1,
    borderRadius: 20,
    padding: 18,
    height: 146,
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
});
