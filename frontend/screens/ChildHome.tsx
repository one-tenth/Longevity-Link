import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../App';

type ChildHomeNavProp = StackNavigationProp<RootStackParamList, 'ChildHome'>;

interface Member {
  UserID: number;
  Name: string;
  RelatedID?: number | null;
}

export default function ChildHome() {
  const navigation = useNavigation<ChildHomeNavProp>();
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    const loadSelectedMember = async () => {
      const stored = await AsyncStorage.getItem('selectedMember');
      if (stored) {
        const parsed: Member = JSON.parse(stored);
        setSelectedMember(parsed?.RelatedID ? parsed : null);
        if (parsed?.RelatedID) await AsyncStorage.setItem('elder_name', parsed.Name ?? '');
      } else {
        setSelectedMember(null);
      }
    };
    const unsub = navigation.addListener('focus', loadSelectedMember);
    return unsub;
  }, [navigation]);

  const goHospital = async () => {
    if (!selectedMember || !selectedMember.RelatedID) {
      Alert.alert('提醒', '請先選擇要照護的長者');
      navigation.navigate('FamilyScreen', { mode: 'select' });
      return;
    }
    await AsyncStorage.setItem('elder_name', selectedMember.Name ?? '');
    navigation.navigate('FamilyHospitalList', { elderName: selectedMember.Name });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Setting' as never)}>
          <Feather name="settings" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* User Info（點擊可去選長者） */}
      <TouchableOpacity style={styles.userCard} onPress={() => navigation.navigate('FamilyScreen', { mode: 'select' })}>
        <Image source={require('../img/childhome/grandpa.png')} style={styles.userIcon} />
        <View style={styles.nameRow}>
          <Text style={styles.userName}>{selectedMember?.Name || '尚未選擇'}</Text>
          <View style={{ flex: 1 }} />
          <Feather name="edit-2" size={18} color="#000" style={styles.editIcon} />
        </View>
      </TouchableOpacity>

      {/* 健康狀況 */}
      <View style={styles.featureCardWrapper}>
        <TouchableOpacity style={styles.featureCard} onPress={() => navigation.navigate('Health' as never)}>
          <MaterialIcons name="favorite" size={28} color="#FFF" />
          <Text style={styles.featureText}>健康狀況</Text>
        </TouchableOpacity>
        <View style={styles.cardBottomBlank} />
      </View>

      {/* 用藥資訊 */}
      <View style={styles.featureCardWrapper}>
        <TouchableOpacity style={styles.featureCard} onPress={() => navigation.navigate('Medicine' as never)}>
          <MaterialIcons name="medical-services" size={28} color="#FFF" />
          <Text style={styles.featureText}>用藥資訊</Text>
        </TouchableOpacity>
        <View style={styles.cardBottomBlank} />
      </View>

      {/* 回診資料 */}
      <View style={styles.featureCardWrapper}>
        <TouchableOpacity style={styles.featureCard} onPress={goHospital}>
          <MaterialIcons name="medical-services" size={28} color="#FFF" />
          <Text style={styles.featureText}>回診資料</Text>
        </TouchableOpacity>
        <View style={styles.cardBottomBlank} />
      </View>

      {/* 底部功能列 */}
      <View style={styles.settingBox}>
        <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('Profile' as never)}>
          <FontAwesome name="user" size={28} color="#fff" />
          <Text style={styles.settingLabel}>個人</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('FamilyScreen', { mode: 'full' })}>
          <FontAwesome name="home" size={28} color="#fff" />
          <Text style={styles.settingLabel}>家庭</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('index' as never)}>
          <FontAwesome name="exchange" size={28} color="#fff" />
          <Text style={styles.settingLabel}>切換</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// 你的 styles 原樣保留（略）
const styles = StyleSheet.create({
  // ...沿用你原本這份樣式
  container:{flex:1,backgroundColor:'#FFF'}, header:{backgroundColor:'#FFF',flexDirection:'row',justifyContent:'space-between',alignItems:'center',padding:14},
  userCard:{flexDirection:'row',alignItems:'center',backgroundColor:'#F0F0F0',margin:10,padding:12,borderRadius:30},
  userIcon:{width:80,height:80,borderWidth:3,borderColor:'#000',borderRadius:50,marginRight:10},
  nameRow:{flexDirection:'row',alignItems:'center',flex:1},
  userName:{fontSize:36,fontWeight:'900',color:'#000',fontFamily:'DelaGothicOne-Regular'},
  editIcon:{marginLeft:8},
  featureCardWrapper:{backgroundColor:'#ECF5FF',borderRadius:16,marginHorizontal:20,marginTop:16,borderWidth:2,borderColor:'#C0D8F0',overflow:'hidden'},
  featureCard:{flexDirection:'row',alignItems:'center',padding:10,justifyContent:'flex-start',backgroundColor:'#004B97',gap:14},
  cardBottomBlank:{height:100,backgroundColor:'#ECF5FF'},
  featureText:{color:'#FFF',fontSize:24,fontWeight:'900'},
  settingBox:{position:'absolute',bottom:0,left:20,right:20,flexDirection:'row',justifyContent:'space-around',alignItems:'center',backgroundColor:'#000',paddingVertical:5,borderRadius:50,borderColor:'#fff',borderWidth:2},
  settingItem:{alignItems:'center'},
  settingLabel:{color:'#fff',fontSize:14,marginTop:2,fontWeight:'900'},
});
