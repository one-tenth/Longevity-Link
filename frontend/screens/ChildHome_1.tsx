import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Feather from 'react-native-vector-icons/Feather';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Svg, { Text as SvgText, TextPath, Defs, Path } from 'react-native-svg';


type ChildHomeNavProp = StackNavigationProp<RootStackParamList, 'ChildHome'>;

function ArcText() {
  return (
    <Svg width={360} height={90} viewBox="0 0 360 90" style={{ alignSelf: 'center' }}>
      <Defs>
        <Path id="curve" d="M60,70 Q180,10 300,70" fill="none" />
      </Defs>
      <SvgText
        fill="#FFF"
        fontSize="42"
        fontWeight="bold"
        fontFamily="FascinateInline-Regular"
      >
        <TextPath href="#curve" startOffset="0%" textAnchor="start">
          .CareMate.
        </TextPath>
      </SvgText>
    </Svg>
  );
}


export default function ChildHome() {
  const navigation = useNavigation<ChildHomeNavProp>();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#005757" />
      
      {/* Header */}
      <View style={styles.header}>
        <ArcText />
      </View>

      {/* 使用者資訊 */}
      <View style={styles.userCard}>
        <Image source={require('../img/childhome/grandpa.png')} style={styles.userIcon} />
        <View style={styles.nameRow}>
          <Text style={styles.userName}>爺爺</Text>
          <View style={{ flex: 1 }} />
          <Feather name="edit-2" size={18} color="#FFF" style={styles.editIcon} />
        </View>
      </View>

      {/* 健康狀況卡片 */}
      <View style={styles.featureCardWrapper}>
        <TouchableOpacity style={styles.featureCard} onPress={() => navigation.navigate('Health')}>
          <MaterialIcons name="favorite" size={28} color="#FFF" />
          <Text style={styles.featureText}>健康狀況</Text>
        </TouchableOpacity>
        <View style={styles.cardBottomBlank} />
      </View>

      {/* 用藥資訊卡片 */}
      <View style={styles.featureCardWrapper}>
        <TouchableOpacity style={styles.featureCard} onPress={() => navigation.navigate('Medicine')}>
          <MaterialIcons name="medical-services" size={28} color="#FFF" />
          <Text style={styles.featureText}>用藥資訊</Text>
        </TouchableOpacity>
        <View style={styles.cardBottomBlank} />
      </View>

      {/* 家人定位卡片 */}
      <View style={styles.featureCardWrapper}>
        <TouchableOpacity style={styles.featureCard} onPress={() => navigation.navigate('Location', { elderId: 1})}>
          <MaterialIcons name="location-on" size={28} color="#FFF" />
          <Text style={styles.featureText}>家人定位</Text>
        </TouchableOpacity>
        <View style={styles.cardBottomBlank} />
      </View>

      {/* 底部功能列 */}
      <View style={styles.bottomBox}>
        <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('Profile')}>
          <FontAwesome name="user" size={28} color="#fff" />
          <Text style={styles.settingLabel}>個人</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('FamilySetting')}>
          <FontAwesome name="home" size={28} color="#fff" />
          <Text style={styles.settingLabel}>家庭</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={() => navigation.navigate('index')}>
          <FontAwesome name="exchange" size={28} color="#fff" />
          <Text style={styles.settingLabel}>切換</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  header: {
    width: '100%',
    backgroundColor: '#005757',
    alignItems: 'center',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#003D79',
    margin: 10,
    padding: 12,
    borderRadius: 30,
  },
  userIcon: {
    width: 80,
    height: 80,
    borderColor: '#000',
    borderRadius: 50,
    marginRight: 10,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFF',
    fontFamily: 'DelaGothicOne-Regular',
  },
  editIcon: {
    marginLeft: 8,
  },

  card: {
    width: '90%',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 15,
  },
  cardText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
  },
  bottomBox: {
    position: 'absolute',
    bottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingVertical: 10,
    borderRadius: 50,
    width: '90%',
    alignSelf: 'center',
  },
  settingItem: {
    alignItems: 'center',
  },
  settingLabel: {
    color: '#fff',
    fontSize: 14,
    marginTop: 2,
    fontWeight: '900',
  },
  featureCardWrapper: {
    width: '90%',
    backgroundColor: '#005757',
    borderRadius: 16,
    marginTop: 16,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    justifyContent: 'flex-start',
    backgroundColor: '#005757',
    gap: 14,
  },
  cardBottomBlank: {
    width: '100%',
    height: 120,
    backgroundColor: '#ECF5FF',
  },
  featureText: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
  },

});
