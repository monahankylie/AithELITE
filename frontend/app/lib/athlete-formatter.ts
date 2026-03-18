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
  formatStat(value?: number | null, placeholder: string = "N/A"): string {
    if (value == null || isNaN(value)) return placeholder;
    return value.toFixed(1);
  },

  /**
   * Formats the graduation year.
   */
  formatGradYear(year?: number | string): string {
    if (!year) return "—";
    return String(year);
  },

  /**
   * Formats the graduation year for a short display (e.g., '26).
   */
  formatShortGradYear(year?: number | string): string {
    const y = this.formatGradYear(year);
    if (y === "—") return "—";
    return `'${y.slice(-2)}`;
  }
};
