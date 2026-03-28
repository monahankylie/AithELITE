/**
 * ATHLETE FORMATTER
 * Centralized utility for formatting athlete statistics and physical metrics.
 */

export const athleteFormatter = {
  /**
   * Formats height string or number.
   * If numeric (inches), converts to x'y" format.
   * Returns "—" for 0, "0'0"", or missing values.
   */
  formatHeight(height?: string | number): string {
    if (!height) return "—";
    
    // If it's a number (inches), convert to x'y"
    if (typeof height === "number") {
      if (height === 0) return "—";
      const feet = Math.floor(height / 12);
      const inches = Math.round(height % 12);
      return `${feet}'${inches}"`;
    }

    const h = String(height).trim();
    if (h === "0" || h === "0'0\"" || h === "0\"") return "—";
    
    // If it's a numeric string, try to parse it as inches
    if (/^\d+(\.\d+)?$/.test(h)) {
      const numHeight = parseFloat(h);
      if (numHeight === 0) return "—";
      const feet = Math.floor(numHeight / 12);
      const inches = Math.round(numHeight % 12);
      return `${feet}'${inches}"`;
    }

    return h;
  },

  formatStat: (val: number | null | undefined): string => {
    if (val === null || val === undefined || val === 0) return "0.0";
    // Returns 1 decimal place (e.g., 18.5)
    return val.toLocaleString(undefined, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  },

  /**
   * For percentage-based stats (FG%, 3P%).
   */
  formatPercent: (val: number | null | undefined): string => {
    if (!val) return "0%";
    return `${Math.round(val)}%`;
  },

  /**
   * Formats weight string or number.
   * Returns "—" for 0 or missing values.
   */
  formatWeight(weight?: string | number): string {
    if (weight == null || weight === "" || weight === 0 || weight === "0") return "—";
    return typeof weight === "number" ? `${weight} lbs` : String(weight).includes("lbs") ? weight : `${weight} lbs`;
  },

  /**
   * Formats a numeric stat (PPG, RPG, etc.) to one decimal place.
   * Returns "N/A" or a custom placeholder if missing.
   */
  /**
   * Formats a numeric average (PPG, RPG, etc.) to one decimal place.
   * Input: 1.823 -> Output: "1.8"
   */
  formatAvg(value?: number | null, placeholder: string = "N/A"): string {
    if (value == null || isNaN(value)) return placeholder;
    return value.toFixed(1);
  },

  /**
   * Formats percentages or whole number totals.
   * Input: 52 -> Output: "52%" 
   * Input: 31 -> Output: "31"
   */
  formatWhole(value?: number | null, suffix: string = "", placeholder: string = "0"): string {
    if (value == null || isNaN(value)) return placeholder;
    return `${Math.round(value)}${suffix}`;
  },

  /**
   * Formats the class year.
   */
  formatClassYear(year?: number | string): string {
    if (!year) return "—";
    return String(year);
  },

  /**
   * Formats the class year for a short display (e.g., '26).
   */
  formatShortClassYear(year?: number | string): string {
    const y = this.formatClassYear(year);
    if (y === "—") return "—";
    return `'${y.slice(-2)}`;
  }
};
