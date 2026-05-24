"""
Forecast Service — Tier 3.1

Lightweight trend trajectory prediction using linear regression (numpy only).
No heavy dependencies — Prophet would add 500MB+ and requires C++ build tools.

For a cluster with N history snapshots:
  1. Fit degree-1 polynomial (line) through trend_score over time
  2. Calculate slope, R² (confidence measure)
  3. Extrapolate 24h forward to predict peak / fade
  4. Classify trajectory: rising | declining | stable | volatile

Returns:
  trajectory        — rising | declining | stable | volatile
  slope             — points per hour
  r_squared         — 0–1 confidence of linear fit
  peak_score        — predicted max score
  estimated_peak_in_hours  — hours until peak (None if declining/stable)
  estimated_fade_in_hours  — hours until score hits 0 (None if rising/stable)
  forecast_points   — 24h extrapolated points for sparkline chart
  confidence        — low | medium | high
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

SLOPE_RISING_THRESHOLD   =  0.3   # points/hour
SLOPE_DECLINE_THRESHOLD  = -0.3
MIN_SNAPSHOTS            = 3      # need at least 3 points for meaningful fit
FORECAST_HOURS           = 24


class ForecastService:
    def predict(self, cluster_id: str, snapshots: list) -> Optional[dict]:
        """
        Run linear regression on snapshot history and produce a forecast.
        Returns None if there are not enough data points.
        """
        if len(snapshots) < MIN_SNAPSHOTS:
            return None

        try:
            # ── Parse & sort ─────────────────────────────────────────────
            parsed = []
            for s in snapshots:
                try:
                    ts = datetime.fromisoformat(s["timestamp"])
                    parsed.append((ts, float(s.get("trend_score", 0))))
                except (KeyError, ValueError):
                    continue

            if len(parsed) < MIN_SNAPSHOTS:
                return None

            parsed.sort(key=lambda x: x[0])
            t0 = parsed[0][0]

            # x in hours since first snapshot, y = trend_score
            x = np.array([(ts - t0).total_seconds() / 3600 for ts, _ in parsed])
            y = np.array([score for _, score in parsed])

            # ── Linear regression ─────────────────────────────────────────
            coeffs = np.polyfit(x, y, 1)
            slope, intercept = float(coeffs[0]), float(coeffs[1])

            # R² — how well linear model fits the data
            y_pred = np.polyval(coeffs, x)
            ss_res = float(np.sum((y - y_pred) ** 2))
            ss_tot = float(np.sum((y - np.mean(y)) ** 2))
            r_squared = max(0.0, 1 - ss_res / ss_tot) if ss_tot > 1e-10 else 0.0

            # ── Classify trajectory ───────────────────────────────────────
            if r_squared < 0.3:
                trajectory = "volatile"
            elif slope >= SLOPE_RISING_THRESHOLD:
                trajectory = "rising"
            elif slope <= SLOPE_DECLINE_THRESHOLD:
                trajectory = "declining"
            else:
                trajectory = "stable"

            # ── Predict peak / fade ───────────────────────────────────────
            # Cap extrapolation at FORECAST_HOURS from now
            x_now = float((datetime.utcnow() - t0).total_seconds() / 3600)

            estimated_peak_in_hours = None
            estimated_fade_in_hours = None
            peak_score = float(np.max(y))

            if trajectory == "rising":
                # Predict when score plateaus at 100 or after FORECAST_HOURS
                if slope > 0:
                    hours_to_100 = (100 - np.polyval(coeffs, x_now)) / slope
                    estimated_peak_in_hours = max(0, float(hours_to_100))
                    if estimated_peak_in_hours > FORECAST_HOURS:
                        estimated_peak_in_hours = None   # beyond our window
                peak_score = min(100, float(np.polyval(coeffs, x_now + (estimated_peak_in_hours or FORECAST_HOURS))))

            elif trajectory == "declining":
                # Predict when score hits 0
                current_score = float(np.polyval(coeffs, x_now))
                if slope < 0 and current_score > 0:
                    hours_to_zero = -current_score / slope
                    estimated_fade_in_hours = max(0, float(hours_to_zero))

            # ── 24h forecast points ───────────────────────────────────────
            forecast_timestamps = [
                (datetime.utcnow() + timedelta(hours=h)).isoformat()
                for h in range(0, FORECAST_HOURS + 1, 2)    # every 2h
            ]
            forecast_x = np.array([x_now + h for h in range(0, FORECAST_HOURS + 1, 2)])
            forecast_scores = np.polyval(coeffs, forecast_x)
            forecast_scores = np.clip(forecast_scores, 0, 100).tolist()

            forecast_points = [
                {"timestamp": ts, "predicted_score": round(score, 1)}
                for ts, score in zip(forecast_timestamps, forecast_scores)
            ]

            # ── Confidence ────────────────────────────────────────────────
            confidence = (
                "high"   if r_squared >= 0.7 else
                "medium" if r_squared >= 0.4 else
                "low"
            )

            return {
                "cluster_id": cluster_id,
                "trajectory": trajectory,
                "slope": round(slope, 3),
                "r_squared": round(r_squared, 3),
                "peak_score": round(peak_score, 1),
                "estimated_peak_in_hours": round(estimated_peak_in_hours, 1) if estimated_peak_in_hours is not None else None,
                "estimated_fade_in_hours": round(estimated_fade_in_hours, 1) if estimated_fade_in_hours is not None else None,
                "forecast_points": forecast_points,
                "confidence": confidence,
                "data_points": len(parsed),
                "generated_at": datetime.utcnow().isoformat(),
            }

        except Exception as e:
            logger.error(f"Forecast failed for {cluster_id}: {e}", exc_info=True)
            return None


# Global singleton
forecast_service = ForecastService()
