package com.kanghoun.lifelens.vuzix.core;

import android.os.Handler;
import android.os.Looper;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.URL;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import javax.net.ssl.HttpsURLConnection;

/** No application or AWS secrets belong on the glasses. */
public final class HttpContextGateway implements ContextGateway {
    private final Handler main = new Handler(Looper.getMainLooper());
    private final ExecutorService worker = Executors.newFixedThreadPool(2);
    private final AtomicInteger generation = new AtomicInteger();
    private final Set<HttpsURLConnection> pending = ConcurrentHashMap.newKeySet();
    private final String base;
    public HttpContextGateway(String base) {
        if (!base.startsWith("https://")) throw new IllegalArgumentException("HTTPS required");
        this.base = base;
    }
    public void post(String capability, JSONObject payload, Callback callback) {
        if (!Set.of("vision", "question", "weather").contains(capability)) throw new IllegalArgumentException("Unknown capability");
        int ticket = generation.get();
        worker.execute(() -> {
            HttpsURLConnection connection = null;
            try {
                connection = (HttpsURLConnection) new URL(base + "/api/live/" + capability).openConnection();
                pending.add(connection);
                if (ticket != generation.get()) return;
                connection.setRequestMethod("POST"); connection.setDoOutput(true);
                connection.setConnectTimeout(10000); connection.setReadTimeout(50000);
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setRequestProperty("User-Agent", "LifeLensVuzix/0.3");
                byte[] body = payload.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
                connection.setFixedLengthStreamingMode(body.length);
                try (java.io.OutputStream out = connection.getOutputStream()) { out.write(body); }
                int status = connection.getResponseCode();
                InputStream input = status >= 400 ? connection.getErrorStream() : connection.getInputStream();
                if (input == null) throw new Exception("빈 서버 응답");
                ByteArrayOutputStream bytes = new ByteArrayOutputStream();
                try (InputStream in = input) { byte[] buffer = new byte[4096]; int n; while ((n = in.read(buffer)) != -1) { if (bytes.size() + n > 64000) throw new Exception("응답 크기 초과"); bytes.write(buffer, 0, n); } }
                JSONObject result = new JSONObject(bytes.toString("UTF-8"));
                if (status >= 400) throw new Exception(result.optString("error", "연결 오류 " + status));
                main.post(() -> { if (ticket == generation.get()) callback.complete(result); });
            } catch (Exception error) {
                main.post(() -> { if (ticket == generation.get()) callback.failed("연결 실패. 네트워크를 확인하고 다시 시도해주세요."); });
            } finally { if (connection != null) { pending.remove(connection); connection.disconnect(); } }
        });
    }
    public void cancel() { generation.incrementAndGet(); for (HttpsURLConnection connection : pending) connection.disconnect(); pending.clear(); }
    public void close() { cancel(); worker.shutdownNow(); }
}
