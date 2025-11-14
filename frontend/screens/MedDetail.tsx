// 建立新檔案：screens/MedDetailScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView,
  TouchableOpacity, StatusBar, RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// (IMPORT) 從您的 App.tsx 匯入
import { RootStackParamList } from '../App'; 
// (IMPORT) 您的常數
// import { COLORS, BASE } from '../constants'; 

// (這是您 MedInfo_1.tsx 的常數，我先複製過來用)
const COLORS = {
  white: '#FFFFFF', black: '#111111', textDark: '#111',
  textMid: '#333', line: '#E6E6E6', orange: '#F58402'
};
const BASE = 'http://192.168.0.91:8000';

type NavProp = StackNavigationProp<RootStackParamList, 'MedDetail'>;
type RouteProps = RouteProp<RootStackParamList, 'MedDetail'>;

// (NEW) 這是後端回傳的詳細資料
type MedDetailData = {
  MedId: number | string;
  Disease: string;
  MedName: string;
  AdministrationRoute: string;
  DosageFrequency: string;
  Effect: string;
  SideEffect: string;
};

// (NEW) 用於渲染 "表格" 的小組件
function DataRow({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null; // 如果沒資料就不顯示
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function MedDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { medId } = route.params; // 取得傳入的 MedId

  const [medData, setMedData] = useState<MedDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchMedData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      
      const token = await AsyncStorage.getItem('access');
      if (!token) {
        setErrorMsg('尚未登入，請重新登入。');
        return;
      }
      
      // (CHANGED) 呼叫我們新的 API 端點
      const url = `${BASE}/api/med/detail/${medId}/`;
      const response = await axios.get<MedDetailData>(url, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      
      setMedData(response.data);
    } catch (err: any) {
      console.error('❌ 撈藥物詳細資料失敗:', err?.response?.status, err?.message);
      if (err?.response?.status === 401) {
        setErrorMsg('登入已過期，請重新登入。');
      } else if (err?.response?.status === 404) {
        setErrorMsg('查無此藥物資料。');
      } else {
        setErrorMsg('取得資料失敗，請稍後再試。');
      }
      setMedData(null);
    } finally {
      setLoading(false);
    }
  }, [medId]);

  useEffect(() => {
    fetchMedData();
  }, [fetchMedData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMedData();
    setRefreshing(false);
  }, [fetchMedData]);

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={COLORS.black} />
          <Text style={{ marginTop: 10, fontWeight: '900' }}>資料載入中…</Text>
        </View>
      );
    }

    if (errorMsg) {
      return (
        <View style={styles.centerBox}>
          <Text style={{ fontSize: 16, fontWeight: '900', textAlign: 'center', marginBottom: 16 }}>
            {errorMsg}
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: COLORS.orange }]}
            onPress={fetchMedData}
            activeOpacity={0.9}
          >
            <Text style={styles.buttonText}>重試</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!medData) {
      return (
        <View style={styles.centerBox}>
          <Text style={{ fontSize: 16, fontWeight: '900' }}>找不到資料</Text>
        </View>
      );
    }

    // (NEW) 這裡就是您的 "表格"
    return (
      <View style={styles.tableContainer}>
        <DataRow label="藥物名稱" value={medData.MedName} />
        <DataRow label="主要病症" value={medData.Disease} />
        <DataRow label="服用頻率" value={medData.DosageFrequency} />
        <DataRow label="服用途徑" value={medData.AdministrationRoute} />
        <DataRow label="主要作用" value={medData.Effect} />
        <DataRow label="可能副作用" value={medData.SideEffect} />
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {renderContent()}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: COLORS.orange }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.9}
      >
        <Text style={styles.buttonText}>回前頁</Text>
      </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// (NEW) 新增 Styles
const styles = StyleSheet.create({
  centerBox: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 20 
  },
  tableContainer: {
    margin: 16,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    // (Optional) shadow
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  row: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
  },
  rowLabel: {
    fontSize: 14,
    color: COLORS.textMid,
    fontWeight: '700',
    marginBottom: 6,
  },
  rowValue: {
    fontSize: 16,
    color: COLORS.textDark,
    fontWeight: '800',
    lineHeight: 22,
  },
  button: {
    marginTop: 14,
    width: '60%',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    alignSelf: 'center',
  },
  buttonText: { 
    fontSize: 18, 
    fontWeight: '900', 
    color: COLORS.black 
  },
});