// Compat layer — código existente importa de @/lib/oneSignalPush
// Reexporta sendPush e helpers a partir de @/lib/push-notify
export { sendPush } from './push-notify';
import { sendPush } from './push-notify';

export const notifyAdmin = (title: string, message: string, url?: string) =>
  sendPush({ role: 'admin', title, message, url });

export const notifyClient = (user_id: string, title: string, message: string, url?: string) =>
  sendPush({ role: 'cliente', user_id, title, message, url });
