package com.kanghoun.lifelens.vuzix.localai;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/** Structured output safe to pass into the local policy gate. */
public final class PerceptionResult {
    private final List<String> observations;
    private final float confidence;
    private final String modelId;
    private final long capturedAtMillis;

    public PerceptionResult(
            List<String> observations,
            float confidence,
            String modelId,
            long capturedAtMillis) {
        if (observations == null || observations.isEmpty()) {
            throw new IllegalArgumentException("At least one observation is required");
        }
        if (confidence < 0.0f || confidence > 1.0f) {
            throw new IllegalArgumentException("Confidence must be between 0 and 1");
        }
        this.observations = Collections.unmodifiableList(new ArrayList<>(observations));
        this.confidence = confidence;
        this.modelId = modelId;
        this.capturedAtMillis = capturedAtMillis;
    }

    public List<String> getObservations() { return observations; }
    public float getConfidence() { return confidence; }
    public String getModelId() { return modelId; }
    public long getCapturedAtMillis() { return capturedAtMillis; }
}
