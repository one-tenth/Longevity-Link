// MedInfo_1.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
  ScrollView, Pressable, StatusBar, RefreshControl, Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

import { RootStackParamList } from '../App';

type NavProp = StackNavigationProp<RootStackParamList, 'MedInfo_1'>;
type RouteProps = RouteProp<RootStackParamList, 'MedInfo_1'>;

type MedItem = {
  MedId: number | string;
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
  red: '#D9534F',
  line: '#E6E6E6',
};


const BASE = 'http://192.168.200.146:8000';
const R = 22;

const outerShadow = {
  elevation: 4,
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
};

export default function MedInfo_1() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const prescriptionId = route.params?.prescriptionId; // string（跟 App.tsx 對齊）

  const [medList, setMedList] = useState<MedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchMedDetails = useCallback(async () => {
    if (!prescriptionId) {
      setErrorMsg('尚未選擇藥單，請先回上一頁選擇。');
      setMedList([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const token = await AsyncStorage.getItem('access');
      if (!token) {
        setErrorMsg('尚未登入，請重新登入後再試。');
        setMedList([]);
        return;
      }

      const url = `${BASE}/api/meds/${encodeURIComponent(prescriptionId)}/`;
      const response = await axios.get<MedItem[]>(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });

      setMedList(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      console.error('❌ 撈詳細藥單失敗:', err?.response?.status, err?.response?.data || err?.message);
      if (err?.response?.status === 401) {
        setErrorMsg('登入已過期，請重新登入。');
      } else if (err?.response?.status === 404) {
        setErrorMsg('查無此藥單。');
      } else {
        setErrorMsg('取得用藥資料失敗，請稍後再試。');
      }
      setMedList([]);
    } finally {
      setLoading(false);
    }
  }, [prescriptionId]);

  useEffect(() => {
    fetchMedDetails();
  }, [fetchMedDetails]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMedDetails();
    setRefreshing(false);
  }, [fetchMedDetails]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.black} />
          <Text style={{ marginTop: 10, fontWeight: '900' }}>資料載入中…</Text>
        </View>
      ) : errorMsg ? (
        <ScrollView
          contentContainerStyle={[styles.centerBox, { paddingTop: 80 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <Text style={{ fontSize: 16, fontWeight: '900', textAlign: 'center', marginBottom: 16 }}>
            {errorMsg}
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: COLORS.orange }]}
            onPress={fetchMedDetails}
            activeOpacity={0.9}
          >
            <Text style={styles.buttonText}>重試</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.buttonOutline]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.9}
          >
            <Text style={[styles.buttonText, { color: COLORS.textDark }]}>回前頁</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {medList.length === 0 ? (
            <View style={[styles.centerBox, { paddingTop: 60 }]}>
              <Text style={{ fontSize: 16, fontWeight: '900' }}>此藥單沒有任何用藥資料</Text>
              <TouchableOpacity
                style={[styles.buttonOutline, { marginTop: 16 }]}
                onPress={() => navigation.goBack()}
                activeOpacity={0.9}
              >
                <Text style={[styles.buttonText, { color: COLORS.textDark }]}>回前頁</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {medList.map((m) => (
                <FeatureCard
                  key={m.MedId}
                  title={m.MedName}
                  subtitle={`頻率：${m.DosageFrequency}  ·  途徑：${m.AdministrationRoute}`}
                  right={<MaterialIcons name="medication" size={28} color={COLORS.black} />}
                  onPress={() => {}}
                  withShadow
                  darkText
                  bg={COLORS.cream}
                />
              ))}

              <TouchableOpacity
                style={[styles.button, { backgroundColor: COLORS.orange }]}
                onPress={() => navigation.goBack()}
                activeOpacity={0.9}
              >
                <Text style={styles.buttonText}>回前頁</Text>
              </TouchableOpacity>
            </>
          )}
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
    marginTop: 14,
    width: '60%',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    alignSelf: 'center',
  },
  buttonOutline: {
    marginTop: 10,
    width: '60%',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFF',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.line,
  },
  buttonText: { fontSize: 18, fontWeight: '900', color: COLORS.black },
});

const feature = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: R,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: '900' },
  sub: { marginTop: 4, fontSize: 14 },
});
