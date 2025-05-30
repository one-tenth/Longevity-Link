import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';

export default function ChildHome() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../img/childhome/13866.png')} style={styles.setting} />
        
        <Text style={styles.title}>CareMate</Text>
        <Image source={require('../img/childhome/logo.png')} style={styles.logo} />
      </View>

      <View style={styles.userBox}>
        <Image source={require('../img/childhome/image.png')} style={styles.userIconLarge} />
        <Text style={styles.userText}>爺爺</Text>
                  <Image source={require('../img/childhome/61456.png')} style={styles.edit} />
      </View>

      <View style={styles.alertBox}> 
        <Image source={require('../img/childhome/2058160.png')} style={styles.alertIcon} />
        <View>
          <Text style={styles.alertText}>時間：20:00</Text>
          <Text style={styles.alertText}>來電號碼：</Text>
          <Text style={styles.alertText}>0900-123-456</Text>
        </View>
      </View>

      <View style={styles.gridRow}>
        <TouchableOpacity style={[styles.gridBox, { backgroundColor: '#549D77' }]}> 
          <Image source={require('../img/childhome/Group.png')} style={styles.locate} />
          <Text style={styles.gridText1}>即時位置</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.gridBox, { backgroundColor: '#F4C80B' }]}> 
          <Image source={require('../img/childhome/Vector.png')} style={styles.health} />
          <Text style={styles.gridText}>健康狀況</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.gridRow}>
        <TouchableOpacity style={[styles.gridBox1, { backgroundColor: '#F58402' }]}> 
        <Image source={require('../img/childhome/image-3.png')} style={styles.medcine} />
          <Text style={styles.gridText}>用藥</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.gridBox1, { backgroundColor: '#65B6E4' }]}> 
          <Image source={require('../img/childhome/4320350.png')} style={styles.hospital} />
          <Text style={styles.gridText}>看診</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={[styles.callBox, { backgroundColor: '#F4C80B' }]}> 
        <Image source={require('../img/childhome/image-1.png')} style={styles.phone} />
        <Text style={styles.callText}>通話紀錄</Text>
      </TouchableOpacity>
    </View>
  );
}

//----------------------------------------------------------------------------------
const styles = StyleSheet.create({
  //整個畫面的容器
  container: { 
    flex: 1, 
    backgroundColor: '#FCFEED', 
    alignItems: 'center' 
  },

  //caremate開頭
  header: {
    width: '100%',
    height:70,
    flexDirection: 'row', 
    justifyContent: 'space-between',
    backgroundColor: '#65B6E4',
    position: 'relative',
    marginBottom:20,
    paddingLeft:10,
    paddingRight:10,
  },
  //logo圖片
  logo: { 
    width: 60, 
    height: 60,
    marginTop:15,
  },
  //設定圖片
  setting:{
    width: 40, 
    height: 40,
    marginTop:15,
  },
  //caremate字體
  title: { 
    fontSize: 50, 
    fontWeight:'900', 
    color: '#000', 
  },
  //長輩資訊
  userBox: {
    width: '90%', 
    height:65,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 3,
  },
  //爺爺照片
  userIconLarge: { 
    width: 62, 
    height: 62, 
  textAlign:'center',
    marginTop:2,
  },

  //長輩字體
  userText: { 
    fontSize: 36, 
    fontWeight: '900', 
    marginLeft:50,
    marginTop:5,
  },

  //筆圖
  edit:{
    width: 20, 
    height: 20, 
    marginLeft:100,
    marginTop:20,

  },

  //可疑提醒
  alertBox: {
    width: '90%',
    height:100,
    marginTop:20,
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 10, 
    borderWidth: 3, 
    paddingLeft:5,
    paddingRight:10,
  },

  //可疑提醒圖片
  alertIcon: { 
    width: 60, 
    height: 60, 
    marginRight:20,
    marginLeft:5, 
  },
  //可疑提醒字體
  alertText: { 
    fontSize: 20, 
    fontWeight: '900' 
  },

  //下面幾格
  gridRow: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    width: '90%',
    marginTop:10,
  },

  //框
  gridBox: {
    width: '45%', 
    borderRadius: 10, 
    alignItems: 'center', 
    borderWidth: 3, 
  },

    gridBox1: {
    width: '45%', 
    borderRadius: 10, 
    alignItems: 'center', 
    borderWidth: 3, 
  },
  //文字
gridText: { 
  fontSize: 20, 
  fontWeight: '900',  
  marginTop: 6, 
  textAlign: 'center',
},

gridText1: { 
  fontSize: 20, 
  fontWeight: '900',  
  color: '#fff',
  marginTop: 6, 
  textAlign: 'center',
},

  locate: {
    width: 50, 
    height: 50, 
    marginTop:5
  },

  hospital: {
    width: 55, 
    height: 55, 
    marginTop:5
  },

  medcine: {
    width: 50, 
    height: 50, 
    marginTop:5
  },

  health: {
    width: 54, 
    height: 50,
    marginTop:5 
  },

  phone: {
    width: 54, 
    height: 50, 
  },

  callBox: {
    width: '90%',
    height:70,
    marginTop:20,
    flexDirection: 'row', 
    alignItems: 'center', 
    borderRadius: 10, 
    borderWidth: 3, 
    paddingLeft:5,
    paddingRight:10,
  },
  callText: { 
    fontSize: 20, 
    fontWeight: '900',
    marginLeft: 10 
  },
});

