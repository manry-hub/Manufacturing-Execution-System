import { describe, it, expect } from 'vitest';
import { OeeCalculator } from './oee-calculator.js';

describe('OeeCalculator (ISO 22400-2)', () => {
  it('should calculate Availability, Performance, Quality, and OEE accurately', () => {
    // 8 hours shift = 28,800 seconds PPT
    // Machine ran for 7 hours = 25,200 seconds operating time
    // Availability = 25,200 / 28,800 = 0.8750 (87.5%)
    // Ideal cycle time = 20.0s per part
    // Total parts produced = 1,200 parts
    // Net operating time = 1,200 * 20.0 = 24,000s
    // Performance = 24,000 / 25,200 = 0.9524 (95.24%)
    // Good parts = 1,176 parts (24 rejects)
    // Quality = 1,176 / 1,200 = 0.9800 (98.0%)
    // OEE = 0.8750 * 0.9524 * 0.9800 = 0.8167 (81.67%)

    const result = OeeCalculator.calculate({
      plannedProductionTimeSeconds: 28800,
      operatingTimeSeconds: 25200,
      idealCycleTimeSeconds: 20.0,
      totalPartsProduced: 1200,
      goodPartsCount: 1176,
    });

    expect(result.availability).toBe(0.875);
    expect(result.performance).toBe(0.9524);
    expect(result.quality).toBe(0.98);
    expect(result.oee).toBe(0.8167);
    expect(result.speedOverPerformance).toBe(false);
    expect(result.isValid).toBe(true);
    expect(result.breakdown.scrapPartsCount).toBe(24);
  });

  it('should handle division by zero defensively without throwing or returning NaN', () => {
    const zeroResult = OeeCalculator.calculate({
      plannedProductionTimeSeconds: 0,
      operatingTimeSeconds: 0,
      idealCycleTimeSeconds: 20.0,
      totalPartsProduced: 0,
      goodPartsCount: 0,
    });

    expect(zeroResult.availability).toBe(0);
    expect(zeroResult.performance).toBe(0);
    expect(zeroResult.quality).toBe(1.0);
    expect(zeroResult.oee).toBe(0);
    expect(zeroResult.isValid).toBe(false);
  });

  it('should detect speed-over-performance when machine cycles faster than theoretical ideal', () => {
    // Operating time = 10,000s, but produced 600 parts at ideal 20s (theoretical time = 12,000s)
    // Performance = 12,000 / 10,000 = 1.2000 (120%)
    const result = OeeCalculator.calculate({
      plannedProductionTimeSeconds: 10000,
      operatingTimeSeconds: 10000,
      idealCycleTimeSeconds: 20.0,
      totalPartsProduced: 600,
      goodPartsCount: 600,
    });

    expect(result.performance).toBe(1.2);
    expect(result.speedOverPerformance).toBe(true);
    expect(result.oee).toBe(1.0); // Effective OEE capped at 1.0 for presentation
  });

  it('should aggregate multi-machine OEE using weighted totals, not simple arithmetic averages', () => {
    // Machine 1 (Primary High-Volume Line):
    // PPT: 28,800s, Run: 26,000s, Ideal: 10s, Produced: 2,500 parts, Good: 2,450
    const m1 = {
      plannedProductionTimeSeconds: 28800,
      operatingTimeSeconds: 26000,
      idealCycleTimeSeconds: 10.0,
      totalPartsProduced: 2500,
      goodPartsCount: 2450,
    };

    // Machine 2 (Secondary Cell):
    // PPT: 28,800s, Run: 10,000s (heavy downtime), Ideal: 30s, Produced: 300 parts, Good: 280
    const m2 = {
      plannedProductionTimeSeconds: 28800,
      operatingTimeSeconds: 10000,
      idealCycleTimeSeconds: 30.0,
      totalPartsProduced: 300,
      goodPartsCount: 280,
    };

    const oee1 = OeeCalculator.calculate(m1);
    const oee2 = OeeCalculator.calculate(m2);

    const arithmeticAverageOee = (oee1.oee + oee2.oee) / 2;

    const plantAggregated = OeeCalculator.aggregate([m1, m2]);

    // Weighted Availability = (26000 + 10000) / (28800 + 28800) = 36000 / 57600 = 0.625
    expect(plantAggregated.availability).toBe(0.625);

    // Plant OEE mathematically differs from simple arithmetic average
    expect(plantAggregated.oee).not.toBe(arithmeticAverageOee);
  });
});
