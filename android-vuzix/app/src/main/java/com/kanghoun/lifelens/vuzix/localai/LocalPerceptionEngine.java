package com.kanghoun.lifelens.vuzix.localai;

import android.graphics.Bitmap;

/**
 * Hardware-independent boundary for an on-device image model.
 *
 * Implementations may use MediaPipe or a LiteRT-compatible runtime, but must not
 * upload pixels. The caller owns and should promptly recycle the input bitmap.
 */
public interface LocalPerceptionEngine extends AutoCloseable {
    interface Callback {
        void onResult(PerceptionResult result);
        void onError(Throwable error);
    }

    void analyze(Bitmap frame, long capturedAtMillis, Callback callback);

    @Override
    void close();
}
