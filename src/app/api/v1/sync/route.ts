import { eventEmitter } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const stream = new ReadableStream({
    start(controller) {
      const listener = () => {
        try {
          controller.enqueue(new TextEncoder().encode('data: update\n\n'));
        } catch (error) {
          // Stream might be closed
        }
      };
      eventEmitter.on('update', listener);
      req.signal.addEventListener('abort', () => {
        eventEmitter.off('update', listener);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
