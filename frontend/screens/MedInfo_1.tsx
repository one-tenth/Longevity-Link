import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

type MedInfoNavProp = StackNavigationProp<RootStackParamList, 'MedInfo_1'>;
type MedInfoRouteProp = RouteProp<RootStackParamList, 'MedInfo_1'>;

type MedItem = {
  MedId: number;
  MedName: string;
  DosageFrequency: string;
  AdministrationRoute: string;
};

export default function MedicineInfo() {
  const navigation = useNavigation<MedInfoNavProp>();
  const route = useRoute<MedInfoRouteProp>();
  const { prescriptionId } = route.params;

  const [medList, setMedList] = useState<MedItem[]>([]);

  const fetchMedDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('access');
      const response = await axios.get(
        `http://192.168.0.55:8000/api/meds/${prescriptionId}/`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setMedList(response.data);
    } catch (err) {
      console.error('❌ 撈詳細藥單失敗:', err);
    }
  };

  useEffect(() => {
    fetchMedDetails();
  }, []);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('ChildHome')}>
          <Image source={require('../img/medicine/med.png')} style={styles.home} />
        </TouchableOpacity>
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/medicine/logo.png')} style={styles.logo} />
      </View>

      {/* Profile */}
      <View style={styles.profileRow}>
        <View style={styles.profileBox}>
          <Image source={require('../img/medicine/elderly.png')} style={styles.profileIcon} />
          <Text style={styles.profileText}>爺爺</Text>
        </View>
        <Text style={styles.sectionTitle}>用藥資訊</Text>
      </View>

      <ScrollView style={styles.scrollContainer}>
        {medList.map((med) => (
          <View key={med.MedId} style={styles.card}>
            <View style={styles.row}>
              <Image source={require('../img/medicine/medicine.png')} style={styles.icon} />
              <Text style={styles.cardText}>
                {med.MedName}{"\n"}每次使用 {med.AdministrationRoute}
              </Text>
            </View>
            <View style={styles.row}>
              <Image source={require('../img/medicine/clock.png')} style={styles.icon} />
              <Text style={styles.cardText}>{med.DosageFrequency}</Text>
            </View>
            <View style={styles.actionRow}>
              <Image source={require('../img/medicine/edit.png')} style={styles.actionIcon} />
              <Image source={require('../img/medicine/delete.png')} style={styles.actionIcon} />
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: '#F58402' }]}
          onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>回前頁</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FCFEED'
  },
  header: {
    width: '100%',
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#65B6E4',
    paddingLeft: 10,
    paddingRight: 10,
    alignItems: 'center'
  },
  logo: {
    width: 60,
    height: 60,
    marginTop: 15
  },
  home: {
    width: 50,
    height: 50,
    marginTop: 15
  },
  title: {
    fontSize: 50,
    fontWeight: '900',
    color: '#000'
  },
  profileRow: {
    marginTop: 20,
    flexDirection: 'row',
    marginBottom: 10,
    marginLeft: 5
  },
  profileBox: {
    width: '40%',
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 10,
    backgroundColor: '#fff',
    padding: 1
  },
  profileIcon: {
    width: 55,
    height: 55,
    marginRight: 10
  },
  profileText: {
    fontSize: 30,
    fontWeight: '900'
  },
  sectionTitle: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    paddingLeft: 10,
    marginTop: 20
  },
  illnessBox: {
    flexDirection: 'row',
    borderWidth: 2,
    borderColor: '#000',
    padding: 10,
    backgroundColor: '#fff',
    marginTop: 10,
    alignItems: 'center',
    alignSelf: 'center'
  },
  illnessIcon: {
    width: 40,
    height: 40,
    marginRight: 10
  },
  illnessText: {
    fontSize: 24,
    fontWeight: '900'
  },
  scrollContainer: {
    flex: 1,
    width: '100%'
  },
  card: {
    backgroundColor: '#F4C80B',
    borderRadius: 12,
    borderWidth: 4,
    borderColor: '#000',
    padding: 12,
    marginTop: 15,
    width: '90%',
    alignSelf: 'center'
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  icon: {
    width: 40,
    height: 40,
    marginRight: 10
  },
  cardText: {
    fontSize: 20,
    fontWeight: '900',
    flexShrink: 1
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 5
  },
  actionIcon: {
    width: 30,
    height: 30,
    marginLeft: 20
  },
  button: {
    marginTop: 20,
    marginBottom: 20,
    width: '60%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 4,
    borderColor: '#000',
    alignItems: 'center',
    alignSelf: 'center'
  },
  buttonText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000'
  }
});