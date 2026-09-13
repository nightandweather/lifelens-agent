package com.kanghoun.lifelens.vuzix;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.graphics.Matrix;
import android.graphics.SurfaceTexture;
import android.hardware.camera2.*;
import android.location.LocationManager;
import android.os.*;
import android.speech.*;
import android.speech.tts.TextToSpeech;
import android.util.Base64;
import android.util.Size;
import android.view.*;
import android.widget.*;
import com.kanghoun.lifelens.vuzix.core.*;
import org.json.*;
import java.io.ByteArrayOutputStream;
import java.util.*;

public class MainActivity extends Activity implements TextureView.SurfaceTextureListener {
    private static final int CAMERA_PERMISSION = 9, AUDIO_PERMISSION = 10, LOCATION_PERMISSION = 11;
    private final Handler main = new Handler(Looper.getMainLooper());
    private final HttpContextGateway gateway = new HttpContextGateway("https://lifelens-agent.kanghoun.chatgpt.site");
    private final SceneGate gate = new SceneGate();
    private TextureView preview;
    private CameraDevice camera;
    private CameraCaptureSession cameraSession;
    private Surface cameraSurface;
    private TextView status, title, detail;
    private Button start, modeButton, analyzeButton, voiceButton, weatherButton, saveButton;
    private boolean active, busy, voiceBusy, weatherBusy, cloudConsent, locationConsent, speakEnabled;
    private long epoch, weatherAt, weatherAttempt, weatherRequest;
    private long openingCamera = -1;
    private String mode = "meal";
    private JSONObject observation, weather;
    private SpeechRecognizer recognizer;
    private TextToSpeech tts;
    private boolean ttsReady;
    private CancellationSignal locationCancel;
    private final Runnable scan = new Runnable() {
        @Override public void run() {
            if (!active) return;
            if (!busy && preview.isAvailable() && cameraSession != null) {
                Bitmap small = preview.getBitmap(24, 18);
                if (small != null) { int[] pixels = new int[24 * 18]; small.getPixels(pixels, 0, 24, 0, 0, 24, 18); small.recycle(); if (gate.sample(pixels, SystemClock.elapsedRealtime())) analyze(); }
            }
            if (mode.equals("mobility") && locationConsent && weatherAttempt > 0 && SystemClock.elapsedRealtime() - weatherAttempt > 300000 && !weatherBusy) fetchWeather();
            main.postDelayed(this, 3000);
        }
    };
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        FrameLayout root = new FrameLayout(this); root.setBackgroundColor(Color.BLACK);
        preview = new TextureView(this); preview.setSurfaceTextureListener(this); root.addView(preview, new FrameLayout.LayoutParams(-1, -1));
        ScrollView scroll = new ScrollView(this); scroll.setFillViewport(true);
        LinearLayout hud = new LinearLayout(this); hud.setOrientation(LinearLayout.VERTICAL); hud.setPadding(16, 10, 16, 10); hud.setBackgroundColor(0xB0101711);
        scroll.addView(hud); root.addView(scroll, new FrameLayout.LayoutParams(-1, -1));
        status = label("LifeLens · 세션 종료", 12, 0xFFDFFF78); title = label("지금, 눈앞의 일상", 24, Color.WHITE); detail = label("카메라를 시작하면 실제 장면을 분석해요.\n방향키로 이동 · 선택키로 실행", 16, Color.WHITE);
        hud.addView(status); hud.addView(title); hud.addView(detail);
        LinearLayout row = new LinearLayout(this); row.setOrientation(LinearLayout.HORIZONTAL); hud.addView(row);
        start = button("시작", row, () -> { if (active) stopSession(); else consentAndStart(); });
        modeButton = button("식사", row, () -> { stopSession(); mode = mode.equals("meal") ? "mobility" : "meal"; modeButton.setText(mode.equals("meal") ? "식사" : "귀가"); title.setText(mode.equals("meal") ? "음식을 비춰주세요" : "귀갓길 날씨를 확인하세요"); });
        analyzeButton = button("다시 보기", row, this::analyze);
        voiceButton = button("질문", row, this::voice);
        LinearLayout second = new LinearLayout(this); hud.addView(second);
        weatherButton = button("날씨", second, this::locationConsent);
        saveButton = button("기록", second, this::confirmMeal);
        button("음성 안내", second, () -> { speakEnabled = !speakEnabled; status.setText(speakEnabled ? "음성 안내 켜짐" : "음성 안내 꺼짐"); if (!speakEnabled && tts != null) tts.stop(); });
        button("기록 보기", second, this::showRecords);
        setContentView(root); start.requestFocus(); updateButtons();
        tts = new TextToSpeech(this, code -> { if (code == TextToSpeech.SUCCESS) { int result = tts.setLanguage(Locale.KOREAN); ttsReady = result >= 0; } });
    }
    private TextView label(String text, int size, int color) { TextView v = new TextView(this); v.setText(text); v.setTextSize(size); v.setTextColor(color); v.setPadding(0, 4, 0, 6); return v; }
    private Button button(String text, LinearLayout parent, Runnable action) { Button b = new Button(this); b.setText(text); b.setTextSize(12); b.setMinWidth(0); b.setPadding(4, 0, 4, 0); parent.addView(b, new LinearLayout.LayoutParams(0, 48, 1)); b.setOnClickListener(v -> action.run()); return b; }
    private void updateButtons() { start.setText(active ? "종료" : "시작"); analyzeButton.setEnabled(active && !busy && cameraSession != null); voiceButton.setEnabled(active && !voiceBusy); saveButton.setEnabled(active && observation != null && observation.optJSONObject("food") != null); weatherButton.setEnabled(!weatherBusy); }
    private void consentAndStart() {
        new AlertDialog.Builder(this).setTitle("카메라 분석 시작")
            .setMessage("장면이 바뀌면 축소한 사진을 AWS Bedrock에 보내 분석합니다. LifeLens는 사진을 저장하지 않습니다. 화면을 벗어나면 카메라와 마이크를 멈춥니다.")
            .setNegativeButton("취소", null).setPositiveButton("동의하고 시작", (d, w) -> { cloudConsent = true; if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION); else begin(); }).show();
    }
    private void begin() { active = true; epoch++; gate.reset(); status.setText("장면이 안정되면 분석해요"); openCamera(); main.removeCallbacks(scan); main.postDelayed(scan, 3000); updateButtons(); }
    private void stopSession() { active = false; epoch++; busy = false; voiceBusy = false; weatherBusy = false; cloudConsent = false; locationConsent = false; weatherAt = 0; weatherAttempt = 0; weatherRequest++; gateway.cancel(); main.removeCallbacks(scan); if (locationCancel != null) locationCancel.cancel(); closeCamera(); stopVoice(); if (tts != null) tts.stop(); observation = null; weather = null; gate.reset(); status.setText("세션 종료 · 카메라·마이크 꺼짐"); detail.setText("승인한 기록만 이 기기에 남아요."); updateButtons(); }
    private JSONObject json(Object... fields) { JSONObject o = new JSONObject(); try { for (int i = 0; i < fields.length; i += 2) o.put((String) fields[i], fields[i + 1]); } catch (JSONException e) { throw new IllegalArgumentException(e); } return o; }
    private void analyze() {
        if (!active || !cloudConsent || busy || cameraSession == null) return;
        Bitmap frame = preview.getBitmap(640, 480); if (frame == null) return;
        ByteArrayOutputStream bytes = new ByteArrayOutputStream(); frame.compress(Bitmap.CompressFormat.JPEG, 70, bytes); frame.recycle();
        String image = "data:image/jpeg;base64," + Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP);
        busy = true; observation = null; status.setText("실제 장면 분석 중…"); detail.setText(""); updateButtons(); long ticket = epoch;
        gateway.post("vision", json("image", image, "mode", mode, "cloudConsent", true, "sessionActive", true), new ContextGateway.Callback() {
            public void complete(JSONObject value) { if (!active || ticket != epoch) return; busy = false; observation = value; JSONObject food = value.optJSONObject("food");
                title.setText(food == null ? value.optString("headline") : food.optString("name") + " · " + food.optInt("kcalLow") + "–" + food.optInt("kcalHigh") + " kcal 추정");
                detail.setText(value.optString("uncertainty")); status.setText("사진 기반 AI 추정 · " + new java.text.SimpleDateFormat("HH:mm", Locale.KOREAN).format(new Date()));
                if (gate.notify(value.optString("signature"), value.optDouble("confidence", 0), SystemClock.elapsedRealtime())) say(title.getText().toString()); updateButtons(); }
            public void failed(String message) { if (ticket != epoch) return; busy = false; gate.failed(); status.setText(message); updateButtons(); }
        });
    }
    private void say(String text) { if (active && speakEnabled && ttsReady) tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "lifelens"); }
    private void voice() {
        if (!active || voiceBusy) return;
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) { requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, AUDIO_PERMISSION); return; }
        if (!SpeechRecognizer.isRecognitionAvailable(this)) { textQuestion("음성인식 서비스가 없어요. Vuzix Voice Input 설치·언어 지원을 확인하거나 질문을 입력하세요."); return; }
        new AlertDialog.Builder(this).setTitle("음성 질문").setMessage("인식 서비스가 음성을 처리할 수 있습니다. 인식된 질문과 현재 관찰은 AI에 전달됩니다.").setNegativeButton("취소", null).setPositiveButton("듣기 시작", (d, w) -> startVoice()).show();
    }
    private void startVoice() {
        if (!active) return; stopVoice(); voiceBusy = true; updateButtons(); long ticket = epoch;
        recognizer = SpeechRecognizer.createSpeechRecognizer(this);
        recognizer.setRecognitionListener(new RecognitionListener() {
            public void onReadyForSpeech(Bundle b) { if (active && ticket == epoch) status.setText("듣는 중…"); }
            public void onResults(Bundle b) { ArrayList<String> lines = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION); stopVoice(); if (active && ticket == epoch && lines != null && !lines.isEmpty()) ask(lines.get(0)); }
            public void onError(int error) { stopVoice(); if (active && ticket == epoch) textQuestion("음성인식 실패 (" + error + "). 질문을 입력할 수 있어요."); }
            public void onBeginningOfSpeech() {} public void onRmsChanged(float x) {} public void onBufferReceived(byte[] b) {} public void onEndOfSpeech() {} public void onPartialResults(Bundle b) {} public void onEvent(int t, Bundle b) {}
        });
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH); intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ko-KR"); intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        recognizer.startListening(intent);
    }
    private void stopVoice() { if (recognizer != null) { SpeechRecognizer old = recognizer; recognizer = null; old.destroy(); } voiceBusy = false; if (voiceButton != null) updateButtons(); }
    private void textQuestion(String explanation) { EditText field = new EditText(this); field.setHint("질문 입력"); field.setFilters(new android.text.InputFilter[]{new android.text.InputFilter.LengthFilter(500)}); new AlertDialog.Builder(this).setTitle(explanation).setView(field).setNegativeButton("취소", null).setPositiveButton("질문", (d, w) -> ask(field.getText().toString())).show(); }
    private void ask(String question) {
        if (!active || question.trim().isEmpty() || voiceBusy) return;
        if (question.length() > 500) { status.setText("질문은 500자 이내로 말씀해주세요."); return; }
        voiceBusy = true; updateButtons(); long ticket = epoch; status.setText("질문: " + question);
        JSONObject fresh = SystemClock.elapsedRealtime() - weatherAt < 900000 ? weather : null;
        gateway.post("question", json("question", question, "observation", observation, "weather", fresh, "sessionActive", true), new ContextGateway.Callback() {
            public void complete(JSONObject result) { if (!active || ticket != epoch) return; voiceBusy = false; detail.setText(result.optString("answer")); say(result.optString("answer")); updateButtons(); }
            public void failed(String message) { if (ticket != epoch) return; voiceBusy = false; status.setText(message); updateButtons(); }
        });
    }
    private void locationConsent() { new AlertDialog.Builder(this).setTitle("현재 위치 날씨").setMessage("현재 위치를 약 100m 단위로 줄여 예보 조회에 사용해요. 위치 제공 기능이 없는 기기는 조회할 수 없어요.").setNegativeButton("취소", null).setPositiveButton("동의하고 조회", (d, w) -> { locationConsent = true; if (checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) requestPermissions(new String[]{Manifest.permission.ACCESS_COARSE_LOCATION}, LOCATION_PERMISSION); else fetchWeather(); }).show(); }
    private void fetchWeather() {
        if (!locationConsent || weatherBusy || checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) return;
        if (!active) { active = true; epoch++; main.removeCallbacks(scan); main.postDelayed(scan, 3000); } weatherBusy = true; weather = null; title.setText("현재 날씨 확인 중…"); detail.setText(""); weatherAttempt = SystemClock.elapsedRealtime(); updateButtons(); long ticket = epoch; long request = ++weatherRequest;
        LocationManager manager = (LocationManager) getSystemService(LOCATION_SERVICE);
        String provider = manager.isProviderEnabled(LocationManager.NETWORK_PROVIDER) ? LocationManager.NETWORK_PROVIDER : null;
        if (provider == null) { weatherBusy = false; status.setText("네트워크 위치를 사용할 수 없어요. 기기의 위치 서비스를 확인해주세요."); updateButtons(); return; }
        locationCancel = new CancellationSignal(); status.setText("위치 확인 중…");
        main.postDelayed(() -> { if (ticket == epoch && request == weatherRequest && weatherBusy) { locationCancel.cancel(); weatherRequest++; weatherBusy = false; weather = null; status.setText("위치·날씨 조회 시간이 초과됐어요. 다시 시도해주세요."); updateButtons(); } }, 25000);
        manager.getCurrentLocation(provider, locationCancel, getMainExecutor(), position -> {
            if (ticket != epoch || request != weatherRequest || !active || !weatherBusy) return;
            if (position == null) { weatherBusy = false; status.setText("현재 위치를 얻지 못했어요."); updateButtons(); return; }
            JSONObject coords = json("latitude", Math.round(position.getLatitude() * 1000) / 1000.0, "longitude", Math.round(position.getLongitude() * 1000) / 1000.0);
            gateway.post("weather", json("location", coords, "locationConsent", true), new ContextGateway.Callback() {
                public void complete(JSONObject result) { if (ticket != epoch || request != weatherRequest || !active) return; weatherBusy = false; weather = result; weatherAt = SystemClock.elapsedRealtime(); title.setText(result.optString("headline")); JSONArray hours = result.optJSONArray("hours"); StringBuilder text = new StringBuilder(); if (hours != null) for (int i = 0; i < Math.min(3, hours.length()); i++) { JSONObject h = hours.optJSONObject(i); if (h != null) text.append(weatherTime(h.optString("time"))).append(" · ").append(h.optString("precipitationLabel")).append("\n"); } text.append(result.optString("fallbackReason", "시간별 예보 · 정확한 시작 분은 알 수 없어요")); detail.setText(text); JSONObject source = result.optJSONObject("source"); status.setText(source == null ? "날씨 조회 완료" : source.optString("name")); say(result.optString("headline")); updateButtons(); }
                public void failed(String message) { if (ticket != epoch || request != weatherRequest) return; weatherBusy = false; weather = null; title.setText("최신 날씨를 확인하지 못했어요"); status.setText(message); updateButtons(); }
            });
        });
    }
    private String weatherTime(String iso) { try { return java.time.OffsetDateTime.parse(iso).atZoneSameInstant(java.time.ZoneId.of("Asia/Seoul")).format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")) + " KST"; } catch (Exception e) { return iso; } }
    private void confirmMeal() {
        JSONObject food = observation == null ? null : observation.optJSONObject("food"); if (!active || food == null) return;
        JSONObject record = json("name", food.optString("name"), "kcalLow", food.optInt("kcalLow"), "kcalHigh", food.optInt("kcalHigh"), "at", System.currentTimeMillis()); long ticket = epoch;
        new AlertDialog.Builder(this).setTitle("이 식사를 기록할까요?").setMessage(food.optString("name") + " · " + food.optInt("kcalLow") + "–" + food.optInt("kcalHigh") + " kcal 추정\n사진 없이 이 안경에만 저장해요.").setNegativeButton("취소", null).setPositiveButton("확인하고 저장", (d, w) -> { if (!active || ticket != epoch) return; try { JSONArray records = new JSONArray(getPreferences(0).getString("meals", "[]")); JSONArray next = new JSONArray(); next.put(record); for (int i = 0; i < Math.min(19, records.length()); i++) next.put(records.get(i)); boolean ok = getPreferences(0).edit().putString("meals", next.toString()).commit(); status.setText(ok ? "식사 기록 저장 완료 · 사진 저장 안 함" : "저장하지 못했어요"); } catch (JSONException e) { status.setText("저장하지 못했어요"); } }).show();
    }
    private void showRecords() { StringBuilder text = new StringBuilder(); try { JSONArray records = new JSONArray(getPreferences(0).getString("meals", "[]")); for (int i = 0; i < records.length(); i++) { JSONObject r = records.getJSONObject(i); text.append(r.optString("name")).append(" · ").append(r.optInt("kcalLow")).append("–").append(r.optInt("kcalHigh")).append(" kcal\n"); } } catch (JSONException ignored) {} new AlertDialog.Builder(this).setTitle("안경에 저장한 식사").setMessage(text.length() == 0 ? "기록이 없어요" : text.toString()).setPositiveButton("닫기", null).setNegativeButton("전체 삭제", (d, w) -> new AlertDialog.Builder(this).setMessage("이 안경의 식사 기록을 모두 삭제할까요?").setNegativeButton("취소", null).setPositiveButton("삭제", (x, y) -> { boolean ok = getPreferences(0).edit().remove("meals").commit(); status.setText(ok ? "기록을 삭제했어요" : "삭제하지 못했어요"); }).show()).show(); }
    @Override public void onRequestPermissionsResult(int request, String[] permissions, int[] results) { super.onRequestPermissionsResult(request, permissions, results); if (results.length == 0 || results[0] != PackageManager.PERMISSION_GRANTED) { status.setText("권한이 허용되지 않았어요"); return; } if (request == CAMERA_PERMISSION && cloudConsent) begin(); if (request == AUDIO_PERMISSION && active) voice(); if (request == LOCATION_PERMISSION && locationConsent) fetchWeather(); }
    @Override public boolean onKeyDown(int key, KeyEvent event) { if (key == KeyEvent.KEYCODE_BACK && active) { stopSession(); return true; } if (key == KeyEvent.KEYCODE_MENU && event.getRepeatCount() == 0) { voice(); return true; } return super.onKeyDown(key, event); }
    private void openCamera() {
        if (!active || !cloudConsent || !preview.isAvailable() || camera != null || openingCamera == epoch || checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) return;
        long ticket = epoch; openingCamera = ticket;
        try { CameraManager manager = (CameraManager) getSystemService(CAMERA_SERVICE); String selected = null;
            for (String id : manager.getCameraIdList()) { Integer facing = manager.getCameraCharacteristics(id).get(CameraCharacteristics.LENS_FACING); if (selected == null || (facing != null && facing == CameraCharacteristics.LENS_FACING_BACK)) selected = id; }
            if (selected == null) throw new Exception();
            CameraCharacteristics info = manager.getCameraCharacteristics(selected); Integer sensor = info.get(CameraCharacteristics.SENSOR_ORIENTATION); int display = getWindowManager().getDefaultDisplay().getRotation() * 90; int rotation = ((sensor == null ? 0 : sensor) - display + 360) % 360;
            Matrix transform = new Matrix(); transform.postRotate(rotation, preview.getWidth() / 2f, preview.getHeight() / 2f); preview.setTransform(transform);
            Size[] options = info.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP).getOutputSizes(SurfaceTexture.class); Size chosen = options[0]; for (Size size : options) if (size.getWidth() == 640 && size.getHeight() == 480) chosen = size;
            final Size size = chosen;
            manager.openCamera(selected, new CameraDevice.StateCallback() {
                public void onOpened(CameraDevice device) { if (openingCamera == ticket) openingCamera = -1; if (!active || ticket != epoch) { device.close(); return; } camera = device; startPreview(size, ticket); }
                public void onDisconnected(CameraDevice device) { if (openingCamera == ticket) openingCamera = -1; device.close(); if (camera == device) { camera = null; cameraSession = null; updateButtons(); status.setText("카메라 연결 끊김 · 다시 시작해주세요"); } }
                public void onError(CameraDevice device, int error) { onDisconnected(device); }
            }, main);
        } catch (Exception e) { openingCamera = -1; status.setText("카메라를 열지 못했어요. 종료 후 다시 시작해주세요."); }
    }
    private void startPreview(Size size, long ticket) { try { SurfaceTexture texture = preview.getSurfaceTexture(); if (texture == null) return; texture.setDefaultBufferSize(size.getWidth(), size.getHeight()); cameraSurface = new Surface(texture); CaptureRequest.Builder builder = camera.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW); builder.addTarget(cameraSurface); builder.set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE); camera.createCaptureSession(Collections.singletonList(cameraSurface), new CameraCaptureSession.StateCallback() { public void onConfigured(CameraCaptureSession session) { if (!active || ticket != epoch || camera == null) { session.close(); return; } cameraSession = session; try { session.setRepeatingRequest(builder.build(), null, main); updateButtons(); } catch (Exception e) { status.setText("미리보기를 시작하지 못했어요"); } } public void onConfigureFailed(CameraCaptureSession session) { status.setText("카메라 구성 실패"); } }, main); } catch (Exception e) { status.setText("카메라 미리보기 실패"); } }
    private void closeCamera() { openingCamera = -1; if (cameraSession != null) cameraSession.close(); cameraSession = null; if (camera != null) camera.close(); camera = null; if (cameraSurface != null) cameraSurface.release(); cameraSurface = null; }
    public void onSurfaceTextureAvailable(SurfaceTexture s, int w, int h) { openCamera(); } public void onSurfaceTextureSizeChanged(SurfaceTexture s, int w, int h) {} public boolean onSurfaceTextureDestroyed(SurfaceTexture s) { closeCamera(); return true; } public void onSurfaceTextureUpdated(SurfaceTexture s) {}
    @Override protected void onPause() { if (active) stopSession(); super.onPause(); }
    @Override protected void onDestroy() { main.removeCallbacksAndMessages(null); gateway.close(); if (tts != null) tts.shutdown(); super.onDestroy(); }
}
