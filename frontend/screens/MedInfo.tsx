// MedicationInfoScreen.tsx
import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../App';

type NavProp = StackNavigationProp<RootStackParamList, 'MedInfo_1'>;

const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  textDark: '#111',
  textMid: '#333',
  green: '#A6CFA1',
  line: '#E6E6E6',
  gray: '#9AA0A6',
};

const API_BASE = 'http://10.2.61.2:8000';

// ---- 型別：後端目前只回 MedId 與 Disease，足夠用來統計數量與顯示診斷 ----
type MedItem = {
  MedId: number | string;
  Disease?: string;
};

type GroupedPrescription = {
  PrescriptionID: string;
  Disease?: string;
  Meds: MedItem[];
};

export default function MedicationInfoScreen() {
  const navigation = useNavigation<NavProp>();

  const [groupedData, setGroupedData] = useState<GroupedPrescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('access');
      const selected = await AsyncStorage.getItem('selectedMember');
      if (!token || !selected) {
        console.warn('⚠️ 找不到 JWT 或 selectedMember');
        return;
      }
      const member = JSON.parse(selected);

      const res = await axios.get(`${API_BASE}/api/mednames/`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { user_id: member.UserID },
      });

      // 正規化：把診斷放到群組層（優先用 g.Disease，否則用第一筆藥的 Disease）
      const normalized: GroupedPrescription[] = (res.data || []).map((g: any) => {
        const rawArr = g.meds ?? g.Meds ?? g.medications ?? [];
        const raw: any[] = Array.isArray(rawArr) ? rawArr : [];

        const meds: MedItem[] = raw.map((m: any, idx: number) => ({
          MedId: m.MedId ?? m.MedID ?? m.id ?? idx,
          Disease: m.Disease ?? m.disease ?? undefined,
        }));

        return {
          PrescriptionID: String(g.PrescriptionID ?? g.prescription_id ?? ''),
          Disease: g.Disease ?? raw[0]?.Disease ?? raw[0]?.disease ?? undefined,
          Meds: meds,
        };
      });

      setGroupedData(normalized);
    } catch (err) {
      console.error('❌ 撈資料錯誤:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleDelete = async (prescriptionID: string) => {
    try {
      const token = await AsyncStorage.getItem('access');
      const selected = await AsyncStorage.getItem('selectedMember');
      if (!token || !selected) {
        console.warn('⚠️ 找不到 JWT 或 selectedMember');
        return;
      }
      const member = JSON.parse(selected);

      await axios.delete(`${API_BASE}/api/delete-prescription/${prescriptionID}/`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { user_id: member.UserID },
      });

      setGroupedData((prev) => prev.filter((g) => g.PrescriptionID !== prescriptionID));
    } catch (err) {
      console.error('❌ 刪除失敗:', err);
      Alert.alert('刪除失敗', '請稍後再試');
    }
  };

  const handleTakePhoto = () => {
    Alert.alert(
      '新增用藥資訊',
      '請選擇來源',
      [
        { text: '相機拍照', onPress: () => handleCameraUpload() },
        { text: '從相簿選擇', onPress: () => handleGalleryUpload() },
        { text: '取消', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const handleCameraUpload = async () => {
    const result = await launchCamera({ mediaType: 'photo', cameraType: 'back', quality: 0.8 });
    await uploadImage(result);
  };

  const handleGalleryUpload = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    await uploadImage(result);
  };

  const uploadImage = async (result: any) => {
    if (result?.didCancel || result?.errorCode) {
      console.log('❌ 使用者取消或出錯:', result?.errorMessage);
      return;
    }
    const photo = result?.assets?.[0];
    if (!photo) {
      console.log('❌ 沒有獲得圖片');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('access');
      const selected = await AsyncStorage.getItem('selectedMember');
      if (!token || !selected) {
        Alert.alert('提示', '找不到登入資訊或成員。');
        return;
      }
      const member = JSON.parse(selected);

      const formData = new FormData();
      formData.append('image', {
        uri: photo.uri,
        name: 'photo.jpg',
        type: photo.type || 'image/jpeg',
      } as any);
      formData.append('user_id', String(member.UserID));

      await axios.post(`${API_BASE}/ocr-analyze/`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('成功', '圖片上傳成功');
      fetchData();
    } catch (err) {
      console.error('❌ 圖片上傳失敗:', err);
      Alert.alert('失敗', '圖片上傳失敗');
    }
  };

  // ---- Render ----
  const renderPrescription = ({ item }: { item: GroupedPrescription }) => {
    const count = item.Meds?.length ?? 0;
    const diseaseTitle =
      item.Disease && String(item.Disease).trim() ? String(item.Disease) : '未填寫診斷';

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('MedInfo_1', { prescriptionId: item.PrescriptionID })}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">
              {diseaseTitle}
            </Text>
            <Text style={styles.countTag}>{count} 項藥品</Text>
          </View>

          <Text style={styles.cardHint}>點擊查看此藥單的詳細藥品</Text>

          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() =>
                Alert.alert('刪除確認', '確定要刪除這張藥單嗎？', [
                  { text: '取消', style: 'cancel' },
                  {
                    text: '刪除',
                    style: 'destructive',
                    onPress: () => handleDelete(item.PrescriptionID),
                  },
                ])
              }
            >
              <Text style={styles.deleteText}>刪除藥單</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12, color: COLORS.textMid }}>載入中…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <FlatList
        data={groupedData}
        keyExtractor={(g) => String(g.PrescriptionID)}
        renderItem={renderPrescription}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: COLORS.gray }}>目前沒有藥單，請上傳藥袋圖片。</Text>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      />
      <TouchableOpacity style={styles.fab} onPress={handleTakePhoto} activeOpacity={0.9}>
        <MaterialIcons name="add-a-photo" size={28} color={COLORS.black} />
      </TouchableOpacity>
    </View>
  );
}

const R = 18;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  sep: { height: 12 },
  card: {
    borderRadius: R,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.line,
    padding: 14,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  cardTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.textDark,
  },
  countTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#F2F8F2',
    color: '#2F6B2F',
    fontSize: 12,
    fontWeight: '700',
  },
  cardHint: {
    color: COLORS.textMid,
    fontSize: 13,
    marginTop: 4,
  },
  cardFooter: { marginTop: 10, flexDirection: 'row', justifyContent: 'flex-end' },
  deleteBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFEAEA',
  },
  deleteText: { color: '#C62828', fontWeight: '900' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
