import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';

type NavProp = StackNavigationProp<RootStackParamList, 'ChildHome'>;

export default function HealthStatus() {
  const navigation = useNavigation<NavProp>();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('ChildHome')}>
        </TouchableOpacity>
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/childhome/logo.png')} style={styles.logo} />
      </View>

      <View style={styles.profileRow}>
        <View style={styles.profileBox}>
          <Image source={require('../img/medicine/elderly.png')} style={styles.profileIcon} />
          <Text style={styles.profileText}>爺爺</Text>
        </View>
        <Text style={styles.sectionTitle}>用藥資訊</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardText}>3,820步</Text>
      </View>

      <View style={styles.card}>
        <View>
          <Text style={styles.cardText}>收縮壓：120</Text>
          <Text style={styles.cardText}>舒張壓：80</Text>
          <Text style={styles.cardText}>脈搏：80</Text>
        </View>
      </View>

  
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ChildHome')}
      >
        <Text style={styles.buttonText}>回首頁</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFEF4',
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
  title: {
    fontSize: 50,
    fontWeight: '900',
    color: '#000'
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
  card: {
    flexDirection: 'row',
    backgroundColor: '#F4C80B',
    marginTop: 20,
    marginHorizontal: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#000',
    alignItems: 'center',
  },
  cardIcon: {
    width: 50,
    height: 50,
    marginRight: 15,
  },
  cardText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
    marginBottom: 5,
  },
  button: {
    marginTop: 30,
    alignSelf: 'center',
    backgroundColor: '#F58402',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: '#000',
  },
  buttonText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#000',
  },
});


