import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../App';
import DateTimePicker from '@react-native-community/datetimepicker';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

// navigation 型別定義
type MedTimeSettingNavProp = StackNavigationProp<RootStackParamList, 'MedTimeSetting'>;

type TimeItem = {
  label: string;
  time: string;
};

export default function TimeSettingInput() {
  const navigation = useNavigation<MedTimeSettingNavProp>();

  const [times, setTimes] = useState<TimeItem[]>([
    { label: '早上', time: '08:00' },
    { label: '中午', time: '12:00' },
    { label: '晚上', time: '18:00' },
    { label: '睡前', time: '20:00' },
  ]);

  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const [showPicker, setShowPicker] = useState(false);

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }
    setShowPicker(false);
    if (selectedDate && pickerIndex !== null) {
      const updated = [...times];
      const hours = selectedDate.getHours().toString().padStart(2, '0');
      const minutes = selectedDate.getMinutes().toString().padStart(2, '0');
      updated[pickerIndex].time = `${hours}:${minutes}`;
      setTimes(updated);
    }
  };

  const handleSave = () => {
    console.log('目前時間設定：', times);
    Alert.alert('已儲存設定', '時間已成功儲存！');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Medicine')}>
          <FontAwesome name="arrow-left" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>.CareMate.</Text>
      </View>

      <Text style={styles.sectionTitle}>時間設定</Text>

      <ScrollView style={styles.scrollContainer}>
        {times.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.timeRow}
            onPress={() => {
              setPickerIndex(index);
              setShowPicker(true);
            }}
          >
            <View style={styles.timeBlock}>
              <View style={styles.labelBox}><Text style={styles.labelText}>{item.label}</Text></View>
              <View style={styles.line} />
              <View style={styles.timeBox}><Text style={styles.timeText}>{item.time}</Text></View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {showPicker && pickerIndex !== null && (
        <DateTimePicker
          value={new Date(`2023-01-01T${times[pickerIndex].time}`)}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={[styles.button, { backgroundColor: '#005757' }]} onPress={handleSave}>
          <Text style={styles.buttonText}>儲存</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    width: '100%',
    height: 70,
    backgroundColor: '#005757',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: { position: 'absolute', left: 10 },
  title: {
    fontSize: 36,
    color: '#FFF',
    fontFamily: 'FascinateInline-Regular',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#005757',
    textAlign: 'center',
    marginVertical: 10,
  },
  scrollContainer: {
    width: '90%',
    alignSelf: 'center',
    marginBottom: 20,
  },
  timeRow: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 8,
  },
  timeBlock: {
    width: '90%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelBox: {
    width: '30%',
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderColor:'#004B97',
    borderWidth: 3,
    padding: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  labelText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#333',
  },
  line: {
    flex: 1,
    height: 5,
    backgroundColor: '#000079',
    marginHorizontal: 1,
  },
  timeBox: {
    width: '60%',
    height: 65,
    backgroundColor: '#FFF',
    borderRadius: 10,
    borderColor:'#004B97',
    borderWidth: 3,
    padding: 10,
    minWidth: 80,
    alignItems: 'center',
  },
timeText: {
  fontSize: 22,
  fontWeight: 'bold',
  color: '#333',
  backgroundColor: '#FFF',
  paddingHorizontal: 16,
  paddingVertical: 6,
},

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    marginBottom: 20,
  },
  button: {
    width: '50%',
    height: 60,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#000',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    alignItems: 'center',
  },
});
