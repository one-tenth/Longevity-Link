import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../App';
import { launchCamera } from 'react-native-image-picker';

type NavigationProp = StackNavigationProp<RootStackParamList, 'MedInfo'>;

type Medication = {
  MedId: number;
  Disease: string;
};

type GroupedPrescription = {
  PrescriptionID: string;
  medications: Medication[];
};

export default function MedicationInfoScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [groupedData, setGroupedData] = useState<GroupedPrescription[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem('access');
      if (!token) {
        console.warn('⚠️ 找不到 JWT token');
        return;
      }

      const response = await axios.get('http://192.168.0.55:8000/api/mednames/', {
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
      if (!token) return;

      await axios.delete(
        `http://192.168.0.55:8000/api/delete-prescription/${prescriptionID}/`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setGroupedData(prev =>
        prev.filter(group => group.PrescriptionID !== prescriptionID)
      );
    } catch (error) {
      console.error('❌ 刪除失敗:', error);
    }
  };

  const handleTakePhoto = async () => {
    const result = await launchCamera({
      mediaType: 'photo',
      cameraType: 'back',
      quality: 0.8,
    });

    if (result.didCancel || result.errorCode) {
      console.log('❌ 使用者取消或出錯:', result.errorMessage);
      return;
    }

    const photo = result.assets?.[0];
    if (!photo) {
      console.log('❌ 沒有獲得圖片');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('access');
      if (!token) {
        console.warn('⚠️ 找不到 JWT token');
        return;
      }

      const formData = new FormData();
      formData.append('image', {
        uri: photo.uri,
        name: 'photo.jpg',
        type: photo.type || 'image/jpeg',
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
    } catch (error) {
      console.error('❌ 圖片上傳失敗:', error);
      alert('圖片上傳失敗');
    }
  };

  // ✅ 每次畫面進來時自動開始更新，每 3 秒刷新一次
  useFocusEffect(
    useCallback(() => {
      fetchData();
      const interval = setInterval(fetchData, 3000);
      return () => clearInterval(interval); // 頁面離開時停止
    }, [])
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../img/medicine/cold.png')}
          style={styles.avatar}
        />
        <Text style={styles.title}>用藥資訊</Text>
      </View>

      {loading ? (
        <Text>載入中...</Text>
      ) : (
        groupedData.map((group) => {
          const uniqueDiseases = Array.from(
            new Set(group.medications.map((item) => item.Disease))
          );

          return (
            <View key={group.PrescriptionID} style={{ marginBottom: 20, width: '90%' }}>
              {uniqueDiseases.map((disease, index) => (
                <View key={index} style={styles.card}>
                  <Image
                    source={require('../img/medicine/cold.png')}
                    style={styles.cardIcon}
                  />
                  <Text style={styles.cardText}>{disease}</Text>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('MedInfo_1', {
                      prescriptionId: group.PrescriptionID
                    })}
                  >
                    <Image
                      source={require('../img/medicine/view.png')}
                      style={styles.iconButton}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(group.PrescriptionID)}>
                    <Image
                      source={require('../img/medicine/delete.png')}
                      style={styles.iconButton}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          );
        })
      )}

      <TouchableOpacity style={styles.addButton} onPress={handleTakePhoto}>
        <Text style={styles.addText}>新增</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.homeButton}
        onPress={() => navigation.navigate('Medicine')}
      >
        <Text style={styles.homeText}>回前頁</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: '#FFFEF2',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 60,
    height: 60,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFD439',
    padding: 10,
    marginVertical: 8,
    width: '100%',
    borderRadius: 10,
    justifyContent: 'space-between',
  },
  cardIcon: {
    width: 40,
    height: 40,
  },
  cardText: {
    fontSize: 18,
    flex: 1,
    marginLeft: 10,
  },
  iconButton: {
    width: 24,
    height: 24,
    marginHorizontal: 5,
  },
  addButton: {
    backgroundColor: '#A6D9FF',
    padding: 10,
    borderRadius: 10,
    marginTop: 20,
    width: '50%',
    alignItems: 'center',
  },
  addText: {
    fontSize: 18,
    color: '#000',
  },
  homeButton: {
    backgroundColor: '#FF8C1A',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    width: '50%',
    alignItems: 'center',
  },
  homeText: {
    fontSize: 18,
    color: '#000',
  },
});
