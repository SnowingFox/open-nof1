import fs from 'fs/promises';
import path from 'path';
import { TradingRepository, TradingSessionData } from './trading-repository';

export interface TradingSession {
  symbol: string;
  startTime: number;
  endTime: number;
  reasoning: string;
  toolCalls: any[];
  success: boolean;
  error?: string;
  trades?: Array<{
    symbol: string;
    operation: 'Buy' | 'Sell' | 'Hold';
    leverage?: number;
    amount?: number;
    pricing?: number;
    stopLoss?: number;
    takeProfit?: number;
  }>;
}

export class AuditLogger {
  private logDir: string;
  private repository: TradingRepository | null = null;
  private useDatabase: boolean;

  constructor(
    baseDir = 'logs',
    options: {
      useDatabase?: boolean;
      repository?: TradingRepository;
    } = {}
  ) {
    this.logDir = path.join(process.cwd(), baseDir);
    this.useDatabase = options.useDatabase ?? true;
    this.repository = options.repository || (this.useDatabase ? new TradingRepository() : null);
  }

  /**
   * 记录交易会话
   */
  async logSession(session: TradingSession): Promise<void> {
    // Log to file system
    await this.logToFile(session);

    // Log to database if enabled
    if (this.useDatabase && this.repository) {
      await this.logToDatabase(session);
    }
  }

  /**
   * Log session to file system
   */
  private async logToFile(session: TradingSession): Promise<void> {
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

      console.log(`📝 Session logged to file: ${filename}`);
    } catch (error) {
      console.error('Failed to log session to file:', error);
    }
  }

  /**
   * Log session to database
   */
  private async logToDatabase(session: TradingSession): Promise<void> {
    if (!this.repository) {
      return;
    }

    try {
      const sessionData: TradingSessionData = {
        symbol: session.symbol,
        reasoning: session.reasoning,
        userPrompt: JSON.stringify(session.toolCalls),
        toolCalls: session.toolCalls,
        success: session.success,
        error: session.error,
        trades: session.trades,
      };

      await this.repository.saveTradingSession(sessionData);
    } catch (error) {
      console.error('Failed to log session to database:', error);
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
