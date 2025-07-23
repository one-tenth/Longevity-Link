import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

type FamilyNavProp = StackNavigationProp<RootStackParamList, 'FamilyScreen'>;

interface Member {
  UserID: number;
  Name: string;
  RelatedID: number | null;
}

const FamilyScreen = () => {
  const navigation = useNavigation<FamilyNavProp>();
  const [familyName, setFamilyName] = useState('家族名稱');
  const [userId, setUserId] = useState<number | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    const fetchUserAndMembers = async () => {
      const token = await AsyncStorage.getItem('access');
      if (!token) return;

      try {
        const resMe = await fetch('http://172.20.10.4:8000/account/me/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const user = await resMe.json();
        setUserId(user.UserID);
        setFamilyName(`${user.Name}的家庭`);

        const resMembers = await fetch('http://172.20.10.4:8000/family/members/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const membersData = await resMembers.json();
        setMembers(membersData);
      } catch (error) {
        console.error('取得家庭資料失敗:', error);
      }
    };

    fetchUserAndMembers();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../img/hospital/logo.png')} style={styles.logo} />
        <Text style={styles.headerTitle}>CareMate</Text>
      </View>

      <Text style={styles.title}>{familyName}（{members.length}）</Text>

      <ScrollView contentContainerStyle={styles.memberContainer}>
        {members.map((m, index) => (
          <View key={index} style={styles.card}>
            <Image source={require('../img/childhome/image.png')} style={styles.avatar} />
            <Text style={styles.name}>{m.Name}</Text>
            <Text style={[styles.status, m.RelatedID ? styles.elder : styles.family]}>
              {m.RelatedID ? '長者' : '家人'}
            </Text>
          </View>
        ))}
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
  elder: { backgroundColor: '#FF8A65', color: 'white' }, // 長者標籤：橘色
  family: { backgroundColor: '#4DB6AC', color: 'white' }, // 家人標籤：綠藍色
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
    width: '40%',
    alignItems: 'center',
  },
  buttonText: { fontSize: 18, fontWeight: 'bold' },
});

export default FamilyScreen;
