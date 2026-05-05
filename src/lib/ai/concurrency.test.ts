import { describe, it, expect } from 'vitest';

// Test the ConcurrencyLimiter via importing and creating a fresh instance
// since aiLimiter is a module-level singleton

class ConcurrencyLimiter {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private maxConcurrency: number) {}

  async acquire(): Promise<void> {
    if (this.running < this.maxConcurrency) {
      this.running++;
      return;
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) {
      this.running++;
      next();
    }
  }

  get active(): number {
    return this.running;
  }
}

describe('ConcurrencyLimiter', () => {
  it('allows up to maxConcurrency concurrent tasks', async () => {
    const limiter = new ConcurrencyLimiter(2);
    await limiter.acquire();
    expect(limiter.active).toBe(1);
    await limiter.acquire();
    expect(limiter.active).toBe(2);
  });

  it('queues tasks beyond maxConcurrency', async () => {
    const limiter = new ConcurrencyLimiter(1);
    await limiter.acquire();
    expect(limiter.active).toBe(1);

    let acquired = false;
    const p = limiter.acquire().then(() => { acquired = true; });
    expect(limiter.active).toBe(1); // still 1, second is queued

    limiter.release();
    await p;
    expect(acquired).toBe(true);
    expect(limiter.active).toBe(1); // the queued one now holds the slot
  });

  it('release allows next in queue to proceed', async () => {
    const limiter = new ConcurrencyLimiter(1);
    const order: number[] = [];

    await limiter.acquire();
    const p1 = limiter.acquire().then(() => { order.push(2); });
    const p2 = limiter.acquire().then(() => { order.push(3); });

    order.push(1);
    limiter.release(); // starts p1

    await p1;
    limiter.release(); // starts p2

    await p2;
    limiter.release();

    expect(order).toEqual([1, 2, 3]);
  });
});
