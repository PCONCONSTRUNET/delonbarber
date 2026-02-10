import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, BellRing, Check, CheckCheck, Loader2, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationHistoryProps {
  userId: string;
}

const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  success: { 
    icon: <Check className="h-4 w-4" />, 
    color: "bg-green-500/20 text-green-500 border-green-500/30" 
  },
  error: { 
    icon: <Bell className="h-4 w-4" />, 
    color: "bg-red-500/20 text-red-500 border-red-500/30" 
  },
  info: { 
    icon: <BellRing className="h-4 w-4" />, 
    color: "bg-blue-500/20 text-blue-500 border-blue-500/30" 
  },
};

export function NotificationHistory({ userId }: NotificationHistoryProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from("notifications" as any)
      .select("*")
      .eq("user_id", userId)
      .not("title", "ilike", "%Novo Agendamento%")
      .not("title", "ilike", "%Novo agendamento%")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      const typedData = data as unknown as Notification[];
      setNotifications(typedData);
      setUnreadCount(typedData.filter((n) => !n.is_read).length);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to real-time notifications
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          // Skip admin-only notifications (new appointment alerts for admins)
          if (newNotification.title?.includes('Novo Agendamento')) return;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from("notifications" as any)
      .update({ is_read: true })
      .eq("id", id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    const { error } = await supabase
      .from("notifications" as any)
      .update({ is_read: true })
      .in("id", unreadIds);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("Todas as notificações marcadas como lidas");
    }
  };

  if (loading) {
    return (
      <Card className="glass-effect border-border">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            Histórico de Notificações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-effect border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            Histórico de Notificações
            {unreadCount > 0 && (
              <Badge className="bg-primary text-primary-foreground text-xs">
                {unreadCount} nova{unreadCount > 1 ? "s" : ""}
              </Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs gap-1"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3 w-3" />
              Marcar todas
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nenhuma notificação ainda</p>
            <p className="text-xs mt-1">
              Você receberá alertas sobre seus agendamentos aqui
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {notifications.map((notification) => {
              const config = typeConfig[notification.type] || typeConfig.info;
              return (
                <div
                  key={notification.id}
                  className={`p-3 rounded-lg border transition-all cursor-pointer hover:bg-muted/50 ${
                    notification.is_read
                      ? "bg-muted/20 border-border opacity-70"
                      : `${config.color} bg-opacity-10`
                  }`}
                  onClick={() => !notification.is_read && markAsRead(notification.id)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-full ${
                        notification.is_read ? "bg-muted" : config.color
                      }`}
                    >
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-medium text-sm truncate">
                          {notification.title}
                        </h4>
                        {!notification.is_read && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
