package com.kanghoun.lifelens.rayban

import android.graphics.Bitmap
import java.util.concurrent.atomic.AtomicBoolean
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Local-only boundary to insert after decoding a Meta DAT VideoFrame.
 *
 * The sampler drops excess frames, never queues a life log, and recycles every
 * bitmap after local inference. Network code deliberately does not belong here.
 */
class LifeLensFrameSampler(
    private val scope: CoroutineScope,
    private val engine: LocalVisionEngine,
    private val onObservation: suspend (ObservationEnvelope) -> Unit,
    private val minimumIntervalMillis: Long = 2_000,
    private val minimumConfidence: Float = 0.55f,
    private val clockMillis: () -> Long = System::currentTimeMillis,
) {
    private val busy = AtomicBoolean(false)
    @Volatile private var lastAcceptedAtMillis = Long.MIN_VALUE

    fun offerDecodedFrame(frame: Bitmap) {
        val capturedAtMillis = clockMillis()
        val tooSoon =
            lastAcceptedAtMillis != Long.MIN_VALUE &&
                capturedAtMillis - lastAcceptedAtMillis < minimumIntervalMillis

        if (tooSoon || !busy.compareAndSet(false, true)) {
            frame.recycle()
            return
        }

        lastAcceptedAtMillis = capturedAtMillis
        scope.launch(Dispatchers.Default) {
            try {
                val result = engine.analyze(frame)
                if (result.confidence >= minimumConfidence && result.observations.isNotEmpty()) {
                    onObservation(
                        ObservationEnvelope(
                            capturedAtMillis = capturedAtMillis,
                            observations = result.observations.take(12),
                            confidence = result.confidence,
                            modelId = result.modelId,
                            rawMediaRetained = false,
                        )
                    )
                }
            } finally {
                frame.recycle()
                busy.set(false)
            }
        }
    }
}

interface LocalVisionEngine {
    /** Implementations must not retain or upload [frame]. */
    suspend fun analyze(frame: Bitmap): LocalVisionResult
}

data class LocalVisionResult(
    val observations: List<String>,
    val confidence: Float,
    val modelId: String,
)

data class ObservationEnvelope(
    val capturedAtMillis: Long,
    val observations: List<String>,
    val confidence: Float,
    val modelId: String,
    val rawMediaRetained: Boolean,
)
