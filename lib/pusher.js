import Pusher from "pusher";

export const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_KEY,
  secret: process.env.PUSHER_SECRET,
  cluster: process.env.PUSHER_CLUSTER,
  useTLS: true,
});

export async function notify(channel, event, data) {
  if (!process.env.PUSHER_KEY) return;
  try {
    await pusher.trigger(channel, event, data);
  } catch (e) { console.error('pusher trigger failed', e); }
}
