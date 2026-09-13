package com.kanghoun.lifelens.vuzix.core;

/** Pure Java policy shared by camera adapters. Times use elapsedRealtime. */
public final class SceneGate {
    private int[] previous, sent;
    private long lastRequest = -20000, lastNotice = -180000;
    private String noticeKey = "";
    private int stable;
    public static double difference(int[] a, int[] b) {
        if (a == null || b == null || a.length != b.length || a.length == 0) return 1;
        long sum = 0;
        for (int i = 0; i < a.length; i++) { sum += Math.abs(((a[i] >> 16) & 255) - ((b[i] >> 16) & 255)); sum += Math.abs(((a[i] >> 8) & 255) - ((b[i] >> 8) & 255)); sum += Math.abs((a[i] & 255) - (b[i] & 255)); }
        return (double) sum / (a.length * 3 * 255);
    }
    public boolean sample(int[] pixels, long now) {
        stable = difference(previous, pixels) < .08 ? stable + 1 : 0;
        previous = pixels.clone();
        if (stable < 1 || difference(sent, pixels) <= .10 || now - lastRequest < 20000) return false;
        sent = pixels.clone(); lastRequest = now; return true;
    }
    public void failed() { sent = null; }
    public boolean notify(String key, double confidence, long now) {
        if (confidence < .65 || (key.equals(noticeKey) && now - lastNotice < 180000)) return false;
        noticeKey = key; lastNotice = now; return true;
    }
    public void reset() { previous = null; sent = null; stable = 0; lastRequest = -20000; lastNotice = -180000; noticeKey = ""; }
}
