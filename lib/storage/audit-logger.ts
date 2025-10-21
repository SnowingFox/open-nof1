import fs from 'fs/promises';
import path from 'path';

export interface TradingSession {
  symbol: string;
  startTime: number;
  endTime: number;
  reasoning: string;
  toolCalls: any[];
  success: boolean;
  error?: string;
}

export class AuditLogger {
  private logDir: string;

  constructor(baseDir = 'logs') {
    this.logDir = path.join(process.cwd(), baseDir);
  }

  /**
   * 记录交易会话
   */
  async logSession(session: TradingSession): Promise<void> {
    try {
      // 创建日期目录
      const date = new Date().toISOString().split('T')[0];
      const dayDir = path.join(this.logDir, `trade-${date}`);

      await fs.mkdir(dayDir, { recursive: true });

      // 写入日志文件
      const filename = `${session.symbol.replace('/', '-')}-${session.startTime}.json`;
      const filepath = path.join(dayDir, filename);

      await fs.writeFile(
        filepath,
        JSON.stringify(session, null, 2),
        'utf-8'
      );

      console.log(`📝 Session logged: ${filename}`);
    } catch (error) {
      console.error('Failed to log session:', error);
    }
  }

  /**
   * 获取最近的会话记录
   */
  async getRecentSessions(limit = 10): Promise<TradingSession[]> {
    try {
      const files = await this.getAllLogFiles();
      const sessions: TradingSession[] = [];

      for (const file of files.slice(-limit)) {
        const content = await fs.readFile(file, 'utf-8');
        sessions.push(JSON.parse(content));
      }

      return sessions.reverse();
    } catch (error) {
      console.error('Failed to read sessions:', error);
      return [];
    }
  }

  private async getAllLogFiles(): Promise<string[]> {
    const files: string[] = [];

    try {
      const dirs = await fs.readdir(this.logDir);

      for (const dir of dirs) {
        if (dir.startsWith('trade-')) {
          const dayDir = path.join(this.logDir, dir);
          const dayFiles = await fs.readdir(dayDir);

          for (const file of dayFiles) {
            if (file.endsWith('.json')) {
              files.push(path.join(dayDir, file));
            }
          }
        }
      }
    } catch {
      // Directory doesn't exist yet
    }

    return files.sort();
  }
}
