import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const COLORS = {
  white: '#FFFFFF',
  black: '#111111',
  textDark: '#111',
  textMid: '#333',
  green: '#A6CFA1',
};

export default function MedicationInfoScreen() {

  const navigation = useNavigation<NavigationProp>();
  const [groupedData, setGroupedData] = useState<GroupedPrescription[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('access');
      const selected = await AsyncStorage.getItem('selectedMember');
      if (!token || !selected) {
        console.warn('⚠️ 找不到 JWT 或 selectedMember');
        return;
      }


      const member = JSON.parse(selected);

      const response = await axios.get(`http://192.168.0.55:8000/api/mednames/?user_id=${member.UserID}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setGroupedData(response.data);
    } catch (error) {
      console.error('❌ 撈資料錯誤:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (prescriptionID: string) => {
    try {
      const token = await AsyncStorage.getItem('access');
      const selected = await AsyncStorage.getItem('selectedMember');
      if (!token || !selected) {
        console.warn('⚠️ 找不到 JWT 或 selectedMember');
        return;
      }

      const member = JSON.parse(selected);
      console.log('🧪 刪除藥單：selectedMember:', member); // ✅ 印出來看清楚

      await axios.delete(
        `http://192.168.0.55:8000/api/delete-prescription/${prescriptionID}/`,
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { user_id: member.UserID },
        }
      );

      console.log('🧪 要刪的成員：', member);
      
      setGroupedData(prev =>
        prev.filter(group => group.PrescriptionID !== prescriptionID)
      );
    } catch (error) {
      console.error('❌ 刪除失敗:', error);
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

      const res = await axios.post('http://172.20.10.26:8000/ocr-analyze/', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });


      const response = await axios.post(
        'http://192.168.0.55:8000/ocr-analyze/',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('✅ 圖片上傳成功:', response.data);
      alert('圖片上傳成功');
      fetchData(); // 上傳成功後刷新資料

    } catch (error) {
      console.error('❌ 圖片上傳失敗:', error);
      Alert.alert('失敗', '圖片上傳失敗');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* 只保留新增圖片：一個大 ICON 按鈕 */}
      <TouchableOpacity style={styles.bigIconBtn} onPress={handleTakePhoto} activeOpacity={0.85}>
        <MaterialIcons name="add-a-photo" size={34} color={COLORS.black} />
      </TouchableOpacity>
      <Text style={styles.hint}>新增圖片（相機 / 相簿）</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  bigIconBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.green,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  hint: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
});
