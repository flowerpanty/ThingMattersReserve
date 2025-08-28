import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Bell, BellOff } from 'lucide-react';
import { pushService } from '@/lib/push-notifications';
import { useToast } from '@/hooks/use-toast';

export function PushNotificationToggle() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkNotificationSupport();
  }, []);

  const checkNotificationSupport = async () => {
    setIsLoading(true);
    
    const supported = await pushService.init();
    setIsSupported(supported);
    
    if (supported) {
      const subscribed = await pushService.isSubscribed();
      setIsSubscribed(subscribed);
    }
    
    setIsLoading(false);
  };

  const handleToggleNotifications = async () => {
    if (!isSupported) {
      toast({
        title: "알림 지원 안됨",
        description: "이 브라우저는 푸시 알림을 지원하지 않습니다.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isSubscribed) {
        // 구독 해제
        const success = await pushService.unsubscribe();
        if (success) {
          setIsSubscribed(false);
          toast({
            title: "알림 해제됨",
            description: "푸시 알림이 해제되었습니다.",
          });
        } else {
          throw new Error('구독 해제 실패');
        }
      } else {
        // 권한 요청
        const permission = await pushService.requestPermission();
        
        if (permission === 'granted') {
          // 구독 등록
          const subscription = await pushService.subscribe();
          if (subscription) {
            setIsSubscribed(true);
            toast({
              title: "알림 설정 완료",
              description: "새로운 주문이 들어오면 알림을 받게 됩니다.",
            });
          } else {
            throw new Error('구독 등록 실패');
          }
        } else {
          toast({
            title: "알림 권한 거부됨",
            description: "브라우저 설정에서 알림 권한을 허용해주세요.",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('알림 설정 오류:', error);
      toast({
        title: "설정 실패",
        description: "알림 설정 중 오류가 발생했습니다.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    if (!isSubscribed) {
      toast({
        title: "알림 미설정",
        description: "먼저 알림을 허용해주세요.",
        variant: "destructive"
      });
      return;
    }

    try {
      await pushService.sendTestNotification();
      toast({
        title: "테스트 알림 전송",
        description: "테스트 알림이 전송되었습니다.",
      });
    } catch (error) {
      console.error('테스트 알림 전송 실패:', error);
      toast({
        title: "전송 실패",
        description: "테스트 알림 전송에 실패했습니다.",
        variant: "destructive"
      });
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            푸시 알림
          </CardTitle>
          <CardDescription>
            이 브라우저는 푸시 알림을 지원하지 않습니다.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          푸시 알림 설정
        </CardTitle>
        <CardDescription>
          새로운 주문이 들어올 때 핸드폰으로 알림을 받으세요.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isSubscribed ? '알림 켜짐' : '알림 꺼짐'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isSubscribed 
                ? '새로운 주문 알림을 받고 있습니다.' 
                : '알림을 허용하면 새 주문을 놓치지 않을 수 있습니다.'
              }
            </p>
          </div>
          <Switch
            checked={isSubscribed}
            onCheckedChange={handleToggleNotifications}
            disabled={isLoading}
            data-testid="switch-push-notifications"
          />
        </div>
        
        {isSubscribed && (
          <Button
            onClick={handleTestNotification}
            variant="outline"
            size="sm"
            className="w-full"
            data-testid="button-test-notification"
          >
            테스트 알림 보내기
          </Button>
        )}
      </CardContent>
    </Card>
  );
}