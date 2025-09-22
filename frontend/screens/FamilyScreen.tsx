import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

type FamilyNavProp = StackNavigationProp<RootStackParamList, 'FamilyScreen'>;
type FamilyRouteProp = RouteProp<RootStackParamList, 'FamilyScreen'>;


interface Member {
  UserID: number;
  Name: string;
  RelatedID: number | null;
}

const FamilyScreen = () => {
  const navigation = useNavigation<FamilyNavProp>();
  const route = useRoute<FamilyRouteProp>();
  const mode = route.params?.mode || 'full';

  const [familyName, setFamilyName] = useState('家族名稱');
  const [familyCode, setFamilyCode] = useState<string | null>(null); // ✅ 新增
  const [userId, setUserId] = useState<number | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    const fetchUserAndMembers = async () => {
      //await AsyncStorage.removeItem('selectedMember');

      const token = await AsyncStorage.getItem('access');
      if (!token) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'LoginScreen' }],
        });
        return;
      }

      try {
        const resMe = await fetch('http://192.168.0.24:8000/account/me/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resMe.ok) throw new Error('取得使用者失敗');
        const user = await resMe.json();
        console.log('✅ 取得使用者資訊:', user); 
        setUserId(user.UserID);
        setFamilyName(`${user.Name}的家庭`);
        setFamilyCode(user.Fcode); // ✅ 設定 Fcode

        const resMembers = await fetch('http://192.168.0.24:8000/family/members/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resMembers.ok) throw new Error('取得成員失敗');

        const membersData = await resMembers.json();
        if (Array.isArray(membersData)) {
          const filtered = mode === 'select'
            ? membersData.filter((m: Member) => m.RelatedID !== null)
            : membersData;
          setMembers(filtered);
        } else {
          console.warn('成員資料格式錯誤:', membersData);
          setMembers([]);
        }
      } catch (error) {
        console.error('取得家庭資料失敗:', error);
        setMembers([]);
      }
    };

    fetchUserAndMembers();
  }, [mode, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../img/hospital/logo.png')} style={styles.logo} />
        <Text style={styles.headerTitle}>CareMate</Text>
      </View>

      <Text style={styles.title}>{familyName}（{members.length}）</Text>

      {/* ✅ 顯示家庭代碼 */}
      {familyCode && (
        <Text style={{ textAlign: 'center', marginBottom: 10 }}>
          家庭代碼：{familyCode}
        </Text>
      )}

      <ScrollView contentContainerStyle={styles.memberContainer}>
        {members.length > 0 ? (
          members.map((m, index) => (
            <TouchableOpacity
              key={index}
              onPress={async () => {
                await AsyncStorage.setItem('selectedMember', JSON.stringify(m)); // 可選取的成員
                const elderId = m.RelatedID ?? m.UserID;                          // RelatedID 優先
                await AsyncStorage.setItem('elder_id', String(elderId));
                await AsyncStorage.setItem('elder_name', m.Name);
                navigation.navigate('ChildHome');
              }}  
            >
              <View style={styles.card}>
                <Image source={require('../img/childhome/image.png')} style={styles.avatar} />
                <Text style={styles.name}>{m.Name}</Text>
                <Text style={[styles.status, m.RelatedID ? styles.elder : styles.family]}>
                  {m.RelatedID ? '長者' : '家人'}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text>尚未取得成員資料</Text>
        )}
      </ScrollView>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            if (userId !== null) {
              navigation.navigate('RegisterScreen', {
                mode: 'addElder',
                creatorId: userId,
              });
            }
          }}
        >
          <Text style={styles.buttonText}>新增成員</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>回首頁</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FCFEED', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#65B6E4',
    width: '100%',
    padding: 10,
  },
  logo: { width: 40, height: 40 },
  headerTitle: { fontSize: 30, fontWeight: 'bold', marginLeft: 10 },
  title: { fontSize: 24, fontWeight: 'bold', marginVertical: 10 },
  memberContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  card: {
    width: 120,
    height: 160,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderRadius: 10,
    alignItems: 'center',
    margin: 10,
    padding: 10,
  },
  avatar: { width: 60, height: 60, marginBottom: 10 },
  name: { fontSize: 16, fontWeight: 'bold' },
  status: {
    fontSize: 14,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: 'bold',
  },
  elder: { backgroundColor: '#FF8A65', color: 'white' },
  family: { backgroundColor: '#4DB6AC', color: 'white' },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '90%',
    marginVertical: 20,
  },
  button: {
    backgroundColor: '#FBC02D',
    padding: 10,
    borderRadius: 10,
    width: '50%',
    alignItems: 'center',
  },
  buttonText: { fontSize: 18, fontWeight: 'bold' },
});

export default FamilyScreen;
