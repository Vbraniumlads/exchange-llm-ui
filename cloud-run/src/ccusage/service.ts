export interface CCUsageStatus {
  limit: {
    type: 'not_limited' | 'limit' | 'error';
    message: string;
  };
  plan: string;
  active: boolean;
  cost: {
    used: number;
    limit: number;
    percent: number;
  };
  tokens: {
    used: number;
    limit: number;
    percent: number;
  };
  messages: {
    used: number;
    limit: number;
    percent: number;
  };
  time_to_reset: {
    remaining_minutes: number;
    reset_at: string;
  };
  burn_rate: number;
  cost_rate: number;
  predictions: {
    tokens_will_run_out: string;
    limit_resets_at: string;
  };
}

export type PlanType = 'Pro' | 'Max5' | 'Max20';

class CCUsageService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8001') {
    this.baseUrl = baseUrl;
  }

  /**
   * Claude usage 상태를 조회합니다.
   * @param plan 플랜 타입 (Pro, Max5, Max20)
   * @returns CCUsage 상태 정보
   */
  async getStatus(plan: PlanType = 'Pro'): Promise<CCUsageStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/status?plan=${plan}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('CCUsage API 호출 실패:', error);
      throw error;
    }
  }

  /**
   * API 서버의 health 상태를 확인합니다.
   */
  async checkHealth(): Promise<{ status: string; service: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Health check 실패:', error);
      throw error;
    }
  }

  /**
   * 사용량 퍼센트에 따른 상태 색상을 반환합니다.
   */
  getStatusColor(percent: number): string {
    if (percent >= 90) return 'text-red-500';
    if (percent >= 70) return 'text-yellow-500';
    if (percent >= 50) return 'text-orange-500';
    return 'text-green-500';
  }

  /**
   * 남은 시간을 포맷팅합니다.
   */
  formatRemainingTime(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}분`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours < 24) {
      return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
    }
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    return remainingHours > 0 ? `${days}일 ${remainingHours}시간` : `${days}일`;
  }

  /**
   * 비용을 포맷팅합니다.
   */
  formatCost(cost: number): string {
    return `$${cost.toFixed(2)}`;
  }

  /**
   * 토큰 수를 포맷팅합니다.
   */
  formatTokens(tokens: number): string {
    if (tokens >= 1000000) {
      return `${(tokens / 1000000).toFixed(1)}M`;
    }
    if (tokens >= 1000) {
      return `${(tokens / 1000).toFixed(1)}K`;
    }
    return tokens.toString();
  }
}

// 싱글톤 인스턴스 생성
export const ccusageService = new CCUsageService();

// 기본 export
export default ccusageService;
