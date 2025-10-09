// src/app/services/gps-tracker.service.ts
import { Injectable } from '@angular/core';
import { Geolocation, Position } from '@capacitor/geolocation';

interface GpsPoint {
  lat: number;
  lon: number;
  ts: number;
  acc?: number;   // accuracy in meters
  speed?: number; // speed in m/s
}

@Injectable({ providedIn: 'root' })
export class GpsTrackerService {
  private watchId?: string;
  private lastPt?: GpsPoint;
  private miles = 0;
  private persistInterval?: any;

  // constants
  private readonly MPH_10 = 4.47; // 10 mph in m/s
  private readonly MAX_JUMP_METERS = 2000; // reject teleports >2 km
  private readonly MAX_SPEED_MPS = 90;     // ~200 mph sanity cap
  private readonly ACC_THRESHOLD = 50;     // accuracy filter (m)
  private readonly STORAGE_KEY = 'vanguard_miles_cache';

  constructor() {
    // restore cached miles if available
    const cached = localStorage.getItem(this.STORAGE_KEY);
    if (cached) this.miles = parseFloat(cached) || 0;
  }

  private toRad = (d: number) => d * Math.PI / 180;
  private haversine(a: GpsPoint, b: GpsPoint): number {
    const R = 6371000; // meters
    const dLat = this.toRad(b.lat - a.lat);
    const dLon = this.toRad(b.lon - a.lon);
    const s = Math.sin;
    const c = Math.cos;
    const h = s(dLat / 2) ** 2 +
              c(this.toRad(a.lat)) * c(this.toRad(b.lat)) *
              s(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  async startTracking() {
    try {
      await Geolocation.requestPermissions();
      this.watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0
        },
        (pos, err) => {
          if (err || !pos) return;
          this.handlePosition(pos);
        }
      );
      // persist miles every 2 min
      this.persistInterval = setInterval(() => {
        localStorage.setItem(this.STORAGE_KEY, this.miles.toFixed(2));
      }, 120000);
    } catch (error) {
      console.error('GPS permission denied or unavailable:', error);
      throw new Error('GPS tracking unavailable. Please enable location permissions.');
    }
  }

  stopTracking() {
    if (this.watchId) Geolocation.clearWatch({ id: this.watchId });
    if (this.persistInterval) clearInterval(this.persistInterval);
    this.watchId = undefined;
    this.persistInterval = undefined;
  }

  resetMiles() {
    this.miles = 0;
    this.lastPt = undefined;
    localStorage.removeItem(this.STORAGE_KEY);
  }

  getMiles() { return this.miles; }

  private handlePosition(p: Position) {
    const pt: GpsPoint = {
      lat: p.coords.latitude,
      lon: p.coords.longitude,
      ts: p.timestamp ?? Date.now(),
      acc: p.coords.accuracy,
      speed: typeof p.coords.speed === 'number' ? p.coords.speed! : undefined
    };

    // skip bad accuracy points
    if (pt.acc && pt.acc > this.ACC_THRESHOLD) return;

    // compute speed if missing
    if (pt.speed == null && this.lastPt) {
      const dt = (pt.ts - this.lastPt.ts) / 1000;
      if (dt > 0) {
        const d = this.haversine(this.lastPt, pt);
        pt.speed = d / dt;
      }
    }

    // only count driving speeds
    if (this.lastPt && (pt.speed ?? 0) >= this.MPH_10) {
      const dMeters = this.haversine(this.lastPt, pt);
      const dt = (pt.ts - this.lastPt.ts) / 1000;
      if (dMeters > this.MAX_JUMP_METERS) return;
      if (dt > 0 && dMeters / dt > this.MAX_SPEED_MPS) return;
      this.miles += dMeters / 1609.344; // meters → miles
    }

    this.lastPt = pt;
  }
}
