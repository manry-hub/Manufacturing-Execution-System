export interface OeeCalculationInput {
  plannedProductionTimeSeconds: number;
  operatingTimeSeconds: number;
  idealCycleTimeSeconds: number;
  totalPartsProduced: number;
  goodPartsCount: number;
}

export interface OeeMetricsResult {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  speedOverPerformance: boolean;
  isValid: boolean;
  breakdown: {
    plannedProductionTimeSeconds: number;
    operatingTimeSeconds: number;
    idealCycleTimeSeconds: number;
    totalPartsProduced: number;
    goodPartsCount: number;
    scrapPartsCount: number;
  };
}

export class OeeCalculator {
  /**
   * Calculates ISO 22400-2 OEE metrics for an individual equipment or production run.
   */
  public static calculate(input: OeeCalculationInput): OeeMetricsResult {
    const {
      plannedProductionTimeSeconds,
      operatingTimeSeconds,
      idealCycleTimeSeconds,
      totalPartsProduced,
      goodPartsCount,
    } = input;

    // 1. Availability Calculation
    let availability = 0;
    if (plannedProductionTimeSeconds > 0) {
      availability = Math.min(1.0, Math.max(0, operatingTimeSeconds / plannedProductionTimeSeconds));
    }

    // 2. Performance Calculation
    let performance = 0;
    if (operatingTimeSeconds > 0 && idealCycleTimeSeconds > 0) {
      performance = (idealCycleTimeSeconds * totalPartsProduced) / operatingTimeSeconds;
    }

    const speedOverPerformance = performance > 1.0;

    // 3. Quality Calculation
    let quality = 1.0;
    if (totalPartsProduced > 0) {
      quality = Math.min(1.0, Math.max(0, goodPartsCount / totalPartsProduced));
    }

    // 4. Overall OEE (A * P * Q)
    // Note: If performance is clipped for presentation OEE <= 1.0, but raw performance is retained
    const effectivePerformance = Math.min(1.0, performance);
    const oee = Math.round(availability * effectivePerformance * quality * 10000) / 10000;

    const scrapPartsCount = Math.max(0, totalPartsProduced - goodPartsCount);

    return {
      availability: Math.round(availability * 10000) / 10000,
      performance: Math.round(performance * 10000) / 10000,
      quality: Math.round(quality * 10000) / 10000,
      oee,
      speedOverPerformance,
      isValid: plannedProductionTimeSeconds > 0,
      breakdown: {
        plannedProductionTimeSeconds,
        operatingTimeSeconds,
        idealCycleTimeSeconds,
        totalPartsProduced,
        goodPartsCount,
        scrapPartsCount,
      },
    };
  }

  /**
   * Calculates plant-level or area-level OEE via ISO 22400-2 weighted aggregation.
   * Arithmetic averages (1/N * sum(OEE)) are strictly prohibited.
   */
  public static aggregate(inputs: OeeCalculationInput[]): OeeMetricsResult {
    if (!inputs || inputs.length === 0) {
      return {
        availability: 0,
        performance: 0,
        quality: 1.0,
        oee: 0,
        speedOverPerformance: false,
        isValid: false,
        breakdown: {
          plannedProductionTimeSeconds: 0,
          operatingTimeSeconds: 0,
          idealCycleTimeSeconds: 0,
          totalPartsProduced: 0,
          goodPartsCount: 0,
          scrapPartsCount: 0,
        },
      };
    }

    let totalPpt = 0;
    let totalOperating = 0;
    let totalTheoreticalOperatingTime = 0; // sum(idealCycleTime * totalParts)
    let totalProduced = 0;
    let totalGood = 0;

    for (const inp of inputs) {
      totalPpt += inp.plannedProductionTimeSeconds;
      totalOperating += inp.operatingTimeSeconds;
      totalTheoreticalOperatingTime += inp.idealCycleTimeSeconds * inp.totalPartsProduced;
      totalProduced += inp.totalPartsProduced;
      totalGood += inp.goodPartsCount;
    }

    const availability = totalPpt > 0 ? Math.min(1.0, totalOperating / totalPpt) : 0;
    const performance = totalOperating > 0 ? totalTheoreticalOperatingTime / totalOperating : 0;
    const quality = totalProduced > 0 ? Math.min(1.0, totalGood / totalProduced) : 1.0;
    const effectivePerformance = Math.min(1.0, performance);
    const oee = Math.round(availability * effectivePerformance * quality * 10000) / 10000;

    return {
      availability: Math.round(availability * 10000) / 10000,
      performance: Math.round(performance * 10000) / 10000,
      quality: Math.round(quality * 10000) / 10000,
      oee,
      speedOverPerformance: performance > 1.0,
      isValid: totalPpt > 0,
      breakdown: {
        plannedProductionTimeSeconds: totalPpt,
        operatingTimeSeconds: totalOperating,
        idealCycleTimeSeconds: inputs.length > 0 ? inputs[0].idealCycleTimeSeconds : 0,
        totalPartsProduced: totalProduced,
        goodPartsCount: totalGood,
        scrapPartsCount: Math.max(0, totalProduced - totalGood),
      },
    };
  }
}
