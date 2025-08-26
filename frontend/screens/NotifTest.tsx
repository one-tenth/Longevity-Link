import notifee from '@notifee/react-native';
import { Button } from 'react-native';

export default function NotifTest() {
  const handleNotify = async () => {
    await notifee.displayNotification({
      title: '測試通知',
      body: '這是一則通知內容！',
      android: {
        channelId: 'default',
      },
    });
  };

  return <Button title="觸發通知" onPress={handleNotify} />;
}
