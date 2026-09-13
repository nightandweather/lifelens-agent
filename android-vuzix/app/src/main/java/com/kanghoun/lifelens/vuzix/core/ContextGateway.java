package com.kanghoun.lifelens.vuzix.core;

import org.json.JSONObject;

/** Device-neutral context service: adapters supply JPEGs, questions, or locations. */
public interface ContextGateway {
    interface Callback { void complete(JSONObject result); void failed(String message); }
    void post(String capability, JSONObject payload, Callback callback);
    void cancel();
}
