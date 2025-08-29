import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
  ScrollView, Pressable, StatusBar
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type NavProp = StackNavigationProp<RootStackParamList, 'MedInfo_1'>;
type RouteProps = RouteProp<{ MedInfo_1: { prescriptionId?: number } }, 'MedInfo_1'>;

type MedItem = {
  MedId: number;
  MedName: string;
  DosageFrequency: string;
  AdministrationRoute: string;
};

const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  cream: '#FFFCEC',
  textDark: '#111',
  textMid: '#333',
  green: '#A6CFA1',
  grayBox: '#F2F2F2',
  orange: '#F58402',
};

const R = 22;

const outerShadow = {
  elevation: 4,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
};

export default function MedicineInfo() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const prescriptionId = route?.params?.prescriptionId;

  const [medList, setMedList] = useState<MedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchMedDetails = async () => {
    if (!prescriptionId) {
      setErrorMsg('尚未選擇藥單，請先回上一頁選擇。');
      return;
    }
    try {
      setLoading(true);
      setErrorMsg(null);

      const token = await AsyncStorage.getItem('access');

      const response = await axios.get(
        `http://192.168.0.19:8000/api/meds/${prescriptionId}/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }

      );
      setMedList(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('❌ 撈詳細藥單失敗:', err);
      setErrorMsg('取得用藥資料失敗，請稍後再試。');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedDetails();
  }, [prescriptionId]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.black} />
          <Text style={{ marginTop: 10, fontWeight: '900' }}>資料載入中…</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.centerBox}>
          <Text style={{ fontSize: 16, fontWeight: '900', textAlign: 'center', marginBottom: 16 }}>{errorMsg}</Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: COLORS.orange }]} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>回前頁</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {medList.length === 0 ? (
            <View style={styles.centerBox}>
              <Text style={{ fontSize: 16, fontWeight: '900' }}>查無用藥資料</Text>
            </View>
          ) : (
            medList.map((m) => (
              <FeatureCard
                key={m.MedId}
                title={m.MedName}
                subtitle={`頻率: ${m.DosageFrequency} · 途徑: ${m.AdministrationRoute}`}
                right={<MaterialIcons name="medication" size={28} color={COLORS.black} />}
                onPress={() => {}}
                withShadow
                darkText
                bg={COLORS.cream}
              />
            ))
          )}

          <TouchableOpacity style={[styles.button, { backgroundColor: COLORS.orange }]} onPress={() => navigation.goBack()}>
            <Text style={styles.buttonText}>回前頁</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

function FeatureCard({
  bg, title, subtitle, right, onPress, darkText = false, withShadow = false,
}: {
  bg: string; title: string; subtitle?: string; right?: React.ReactNode; onPress: () => void;
  darkText?: boolean; withShadow?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: '#00000010' }}
      style={({ pressed }) => [
        feature.card,
        { backgroundColor: bg },
        withShadow && outerShadow,
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[feature.title, { color: darkText ? COLORS.textDark : COLORS.white }]}>{title}</Text>
        {!!subtitle && <Text style={[feature.sub, { color: darkText ? COLORS.textMid : COLORS.white }]}>{subtitle}</Text>}
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },

  button: {
    marginTop: 20,
    marginBottom: 30,
    width: '60%',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    alignSelf: 'center',
  },
  buttonText: { fontSize: 18, fontWeight: '900', color: COLORS.black },
});

const feature = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 12, borderRadius: R, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 18, fontWeight: '900' },
  sub: { marginTop: 4, fontSize: 14 },
});
