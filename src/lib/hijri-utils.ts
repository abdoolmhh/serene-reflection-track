/**
 * Utility functions for Hijri date conversions using the Intl API.
 */

export const HIJRI_MONTH_NAMES = [
    "Muharram", "Safar", "Rabi' al-Awwal", "Rabi' ath-Thani",
    "Jumada al-Ula", "Jumada al-Akhira", "Rajab", "Sha'ban",
    "Ramadan", "Shawwal", "Dhu al-Qi'dah", "Dhu al-Hijjah"
];

export const HijriUtils = {
    /**
     * Converts a Gregorian date to Hijri parts.
     * Uses islamic-umalqura calendar for accurate Saudi/standard dates.
     */
    getHijriParts(date: Date, offset: number = 0) {
        const adjustedDate = new Date(date);
        adjustedDate.setDate(adjustedDate.getDate() + offset);

        // Try multiple calendar variants for accuracy
        const variants = ['islamic-umalqura', 'islamic-civil', 'islamic'];
        
        for (const variant of variants) {
            try {
                const formatter = new Intl.DateTimeFormat(`en-u-ca-${variant}`, {
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric'
                });

                const parts = formatter.formatToParts(adjustedDate);
                const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
                const month = parseInt(parts.find(p => p.type === 'month')?.value || '1');
                const year = parseInt(parts.find(p => p.type === 'year')?.value || '1');

                // Validate we got a reasonable result
                if (month >= 1 && month <= 12 && day >= 1 && day <= 30 && year > 1400) {
                    return { day, month, year };
                }
            } catch {
                continue;
            }
        }

        // Fallback: algorithmic conversion
        return this.algorithmicHijri(adjustedDate);
    },

    /**
     * Algorithmic Gregorian to Hijri conversion (Kuwaiti algorithm).
     */
    algorithmicHijri(date: Date) {
        const jd = Math.floor((date.getTime() / 86400000) + 2440587.5);
        const l = jd - 1948440 + 10632;
        const n = Math.floor((l - 1) / 10631);
        const remainder = l - 10631 * n + 354;
        const j = Math.floor((10985 - remainder) / 5316) * Math.floor((50 * remainder) / 17719) +
                  Math.floor(remainder / 5670) * Math.floor((43 * remainder) / 15238);
        const adjustedL = remainder - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
                          Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
        const month = Math.floor((24 * adjustedL) / 709);
        const day = adjustedL - Math.floor((709 * month) / 24);
        const year = 30 * n + j - 30;

        return { day, month, year };
    },

    /**
     * Gets the Hijri month name.
     */
    getMonthName(month: number) {
        return HIJRI_MONTH_NAMES[month - 1] || '';
    },

    /**
     * Returns a string representation of the Hijri date range for a Gregorian month.
     */
    getHijriMonthRange(year: number, month: number, offset: number = 0) {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);

        const startH = this.getHijriParts(start, offset);
        const endH = this.getHijriParts(end, offset);

        if (startH.month === endH.month) {
            return `${this.getMonthName(startH.month)} ${startH.year} AH`;
        } else {
            return `${this.getMonthName(startH.month)} – ${this.getMonthName(endH.month)} ${endH.year} AH`;
        }
    },

    /**
     * Check if current Hijri month is Ramadan.
     */
    isRamadan(offset: number = 0) {
        const parts = this.getHijriParts(new Date(), offset);
        return parts.month === 9;
    }
};
