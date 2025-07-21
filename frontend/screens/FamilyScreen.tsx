import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App'; // 根據你實際檔案調整路徑

type FamilyNavProp = StackNavigationProp<RootStackParamList, 'FamilyScreen'>;

const FamilyScreen = () => {
  const navigation = useNavigation<FamilyNavProp>();
  const [familyName, setFamilyName] = useState('家族名稱');
  const [userId, setUserId] = useState<number | null>(null);
  const [members, setMembers] = useState([
    { name: '爺爺', status: '正常', image: require('../img/childhome/image.png') },
    { name: '奶奶', status: '正常', image: require('../img/childhome/image.png') },
    { name: '外公', status: '正常', image: require('../img/childhome/image.png') },
    { name: '外婆', status: '有狀況', image: require('../img/childhome/image.png') },
  ]);

  useEffect(() => {
    const fetchUserId = async () => {
      const token = await AsyncStorage.getItem('access');
      if (token) {
        const res = await fetch('http://172.20.10.2:8000/account/me/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const user = await res.json();
        setUserId(user.UserID);
      }
    };
    fetchUserId();
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
            <Image source={m.image} style={styles.avatar} />
            <Text style={styles.name}>{m.name}</Text>
            <Text style={[styles.status, m.status === '有狀況' ? styles.alert : styles.normal]}>
              {m.status}
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
  status: { fontSize: 14, marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  normal: { backgroundColor: '#AED581', color: 'white' },
  alert: { backgroundColor: '#EF5350', color: 'white' },
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
