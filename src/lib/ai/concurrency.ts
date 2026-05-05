/** 简单的并发控制器：限制同时进行的异步操作数 */

class ConcurrencyLimiter {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private maxConcurrency: number) {}

  /** 获取执行许可，超出限制时等待 */
  async acquire(): Promise<void> {
    if (this.running < this.maxConcurrency) {
      this.running++;
      return;
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }

  /** 释放许可，让下一个等待者执行 */
  release(): void {
    this.running--;
    const next = this.queue.shift();
    if (next) {
      this.running++;
      next();
    }
  }

  /** 当前运行中的任务数 */
  get active(): number {
    return this.running;
  }
}

export const aiLimiter = new ConcurrencyLimiter(3);
