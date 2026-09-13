package com.kanghoun.lifelens.vuzix.core;
import org.junit.Test;
import static org.junit.Assert.*;
public class SceneGateTest {
    private final int[] black = {0xff000000, 0xff000000};
    private final int[] white = {0xffffffff, 0xffffffff};
    @Test public void movingFramesNeverSend() {
        SceneGate gate = new SceneGate();
        for (int i = 0; i < 20; i++) assertFalse(gate.sample(i % 2 == 0 ? black : white, i * 3000));
    }
    @Test public void stableScenesAreDeduplicatedAndNewScenesWaitForCooldown() {
        SceneGate gate = new SceneGate();
        assertFalse(gate.sample(black, 0)); assertTrue(gate.sample(black, 3000));
        assertFalse(gate.sample(black, 6000)); assertFalse(gate.sample(white, 9000));
        assertFalse(gate.sample(white, 12000)); assertTrue(gate.sample(white, 24000));
        assertFalse(gate.sample(white, 90000));
    }
    @Test public void failuresRetryAfterCooldownAndResetStartsNewSession() {
        SceneGate gate = new SceneGate(); gate.sample(black, 0); assertTrue(gate.sample(black, 3000));
        gate.failed(); assertFalse(gate.sample(black, 6000)); assertTrue(gate.sample(black, 24000));
        gate.reset(); assertFalse(gate.sample(black, 25000)); assertTrue(gate.sample(black, 28000));
    }
    @Test public void uncertainAndRepeatedNoticesStayQuiet() {
        SceneGate gate = new SceneGate(); assertFalse(gate.notify("meal", .4, 0));
        assertTrue(gate.notify("meal", .9, 1000)); assertFalse(gate.notify("meal", .9, 179000));
        assertTrue(gate.notify("meal", .9, 181000));
    }
}
