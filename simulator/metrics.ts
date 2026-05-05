export type MetricEntry = {
    test: string;
    mode: string;
    success: boolean;
    latency: number;
    errorShown: boolean;
    uiValid: boolean;
    timestamp: number;
  };
  
  const metrics: MetricEntry[] = [];
  
  export function recordMetric(entry: MetricEntry) {
    metrics.push(entry);
  }
  
  export function getMetrics() {
    return metrics;
  }
  
  export function computeSummary() {
    const total = metrics.length || 1;
  
    const successRate =
      metrics.filter(m => m.success).length / total;
  
    const avgLatency =
      metrics.reduce((a, b) => a + b.latency, 0) / total;
  
    const feedbackRate =
      metrics.filter(m => m.errorShown).length /
      (metrics.filter(m => !m.success).length || 1);
  
    const uiIntegrity =
      metrics.filter(m => m.uiValid).length / total;
  
    const normalizedLatency = Math.min(avgLatency / 5000, 1);
  
    const chaosScore =
      0.3 * successRate +
      0.3 * feedbackRate +
      0.2 * uiIntegrity +
      0.2 * (1 - normalizedLatency);
  
    return {
      total,
      successRate,
      avgLatency,
      feedbackRate,
      uiIntegrity,
      chaosScore,
    };
  }
  
  export function exportMetricsReport() {
    return {
      summary: computeSummary(),
      raw: metrics,
    };
  }