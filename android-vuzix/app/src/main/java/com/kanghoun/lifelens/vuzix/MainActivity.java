package com.kanghoun.lifelens.vuzix;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.SurfaceTexture;
import android.hardware.camera2.CameraCaptureSession;
import android.hardware.camera2.CameraDevice;
import android.hardware.camera2.CameraManager;
import android.hardware.camera2.CaptureRequest;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.content.Intent;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.Surface;
import android.view.TextureView;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.util.ArrayList;
import java.util.Collections;

public class MainActivity extends Activity implements TextureView.SurfaceTextureListener {
    private static final int PERMISSION_REQUEST = 9;
    private TextureView cameraView;
    private CameraDevice camera;
    private CameraCaptureSession session;
    private TextView eyebrow;
    private TextView headline;
    private TextView detail;
    private TextView action;
    private TextView status;
    private int scene = 0;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().getDecorView().setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(16, 23, 17));
        cameraView = new TextureView(this);
        cameraView.setSurfaceTextureListener(this);
        root.addView(cameraView, new FrameLayout.LayoutParams(-1, -1));

        LinearLayout hud = new LinearLayout(this);
        hud.setOrientation(LinearLayout.VERTICAL);
        hud.setGravity(Gravity.BOTTOM);
        hud.setPadding(28, 20, 28, 24);
        hud.setBackgroundColor(Color.argb(72, 6, 12, 8));
        root.addView(hud, new FrameLayout.LayoutParams(-1, -1));

        status = label("● PRIVATE SESSION  •  CAMERA ONLY", 12, 0xFFDFFF78);
        eyebrow = label("MEAL MOMENT", 12, 0xFFDFFF78);
        headline = label("Bibimbap detected", 28, Color.WHITE);
        detail = label("620–760 kcal  •  optional +14–18 min easy run\nDemo profile: 74.2 kg · 21.8% body fat", 16, 0xFFE5E7E2);
        action = label("CENTER: CONFIRM   ◀/▶: MOMENT   MIC: HOLD ENTER", 12, 0xFFDFFF78);
        hud.addView(status);
        spacer(hud, 42);
        hud.addView(eyebrow);
        hud.addView(headline);
        hud.addView(detail);
        spacer(hud, 16);
        hud.addView(action);
        setContentView(root);

        if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO}, PERMISSION_REQUEST);
        }
    }

    private TextView label(String text, int size, int color) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextSize(size);
        view.setTextColor(color);
        view.setShadowLayer(6, 1, 2, Color.BLACK);
        view.setPadding(0, 5, 0, 5);
        return view;
    }

    private void spacer(LinearLayout parent, int height) {
        View view = new View(this);
        parent.addView(view, new LinearLayout.LayoutParams(1, height));
    }

    private void showScene() {
        if (scene == 0) {
            eyebrow.setText("MEAL MOMENT");
            headline.setText("Bibimbap detected");
            detail.setText("620–760 kcal  •  optional +14–18 min easy run\nDemo profile: 74.2 kg · 21.8% body fat");
        } else if (scene == 1) {
            eyebrow.setText("LIVE CONTEXT PLAN");
            headline.setText("Rain in 8 min");
            detail.setText("Safer, well-lit route  •  12 min home\nCAMERA · MOTION · WEATHER · MAP");
        } else {
            eyebrow.setText("SOCIAL MIRROR");
            headline.setText("One promise worth keeping");
            detail.setText("You offered to send the revised slides Friday.\nNo emotion or personality inference.");
        }
    }

    @Override public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_DPAD_RIGHT) {
            scene = (scene + 1) % 3;
            showScene();
            return true;
        }
        if (keyCode == KeyEvent.KEYCODE_DPAD_LEFT) {
            scene = (scene + 2) % 3;
            showScene();
            return true;
        }
        if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER) {
            action.setText("APPROVED FOR THIS SESSION  •  NOTHING SHARED");
            return true;
        }
        if (keyCode == KeyEvent.KEYCODE_ENTER) {
            startVoiceMoment();
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    private void startVoiceMoment() {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, PERMISSION_REQUEST);
            return;
        }
        SpeechRecognizer recognizer = SpeechRecognizer.createSpeechRecognizer(this);
        recognizer.setRecognitionListener(new RecognitionListener() {
            @Override public void onReadyForSpeech(Bundle params) { status.setText("● LISTENING  •  AUDIO NOT SAVED"); }
            @Override public void onResults(Bundle results) {
                ArrayList<String> lines = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                String heard = lines == null || lines.isEmpty() ? "No speech recognized" : lines.get(0);
                scene = 2;
                showScene();
                detail.setText("Heard temporarily: “" + heard + "”\nTranscript is not retained until you confirm a structured note.");
                status.setText("● PRIVATE SESSION  •  RAW AUDIO DISCARDED");
                recognizer.destroy();
            }
            @Override public void onError(int error) { status.setText("● VOICE UNAVAILABLE  •  CAMERA SESSION CONTINUES"); recognizer.destroy(); }
            @Override public void onBeginningOfSpeech() {}
            @Override public void onRmsChanged(float rmsdB) {}
            @Override public void onBufferReceived(byte[] buffer) {}
            @Override public void onEndOfSpeech() {}
            @Override public void onPartialResults(Bundle partialResults) {}
            @Override public void onEvent(int eventType, Bundle params) {}
        });
        Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);
        recognizer.startListening(intent);
    }

    private void openCamera() {
        if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) return;
        try {
            CameraManager manager = (CameraManager) getSystemService(CAMERA_SERVICE);
            String id = manager.getCameraIdList()[0];
            manager.openCamera(id, new CameraDevice.StateCallback() {
                @Override public void onOpened(CameraDevice device) { camera = device; startPreview(); }
                @Override public void onDisconnected(CameraDevice device) { device.close(); camera = null; }
                @Override public void onError(CameraDevice device, int error) { device.close(); camera = null; }
            }, null);
        } catch (Exception exception) {
            status.setText("● CAMERA UNAVAILABLE  •  DEMO OVERLAY ONLY");
        }
    }

    private void startPreview() {
        try {
            SurfaceTexture texture = cameraView.getSurfaceTexture();
            texture.setDefaultBufferSize(1280, 720);
            Surface surface = new Surface(texture);
            CaptureRequest.Builder builder = camera.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW);
            builder.addTarget(surface);
            camera.createCaptureSession(Collections.singletonList(surface), new CameraCaptureSession.StateCallback() {
                @Override public void onConfigured(CameraCaptureSession configured) {
                    session = configured;
                    try { session.setRepeatingRequest(builder.build(), null, null); }
                    catch (Exception ignored) { status.setText("● PREVIEW PAUSED"); }
                }
                @Override public void onConfigureFailed(CameraCaptureSession failed) { status.setText("● CAMERA CONFIGURATION FAILED"); }
            }, null);
        } catch (Exception exception) {
            status.setText("● CAMERA PREVIEW UNAVAILABLE");
        }
    }

    @Override public void onSurfaceTextureAvailable(SurfaceTexture surface, int width, int height) { openCamera(); }
    @Override public void onSurfaceTextureSizeChanged(SurfaceTexture surface, int width, int height) {}
    @Override public boolean onSurfaceTextureDestroyed(SurfaceTexture surface) { closeCamera(); return true; }
    @Override public void onSurfaceTextureUpdated(SurfaceTexture surface) {}

    private void closeCamera() {
        if (session != null) { session.close(); session = null; }
        if (camera != null) { camera.close(); camera = null; }
    }

    @Override protected void onPause() { closeCamera(); super.onPause(); }
    @Override protected void onResume() { super.onResume(); if (cameraView != null && cameraView.isAvailable()) openCamera(); }
}
