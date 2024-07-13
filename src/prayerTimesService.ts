import axios from 'axios';

export interface PrayerTimes {
    fajr: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
}

export async function getPrayerTimes(latitude: number, longitude: number): Promise<PrayerTimes> {
    const response = await axios.get(`https://api.aladhan.com/v1/timings`, {
        params: {
            latitude,
            longitude,
            method: 2 // Calculation method
        }
    });
    const timings = response.data.data.timings;
    return {
        fajr: timings.Fajr,
        dhuhr: timings.Dhuhr,
        asr: timings.Asr,
        maghrib: timings.Maghrib,
        isha: timings.Isha
    };
}
