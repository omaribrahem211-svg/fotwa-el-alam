package com.asomygames.fotwa;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

/**
 * فتوة العالم: full-screen landscape 3D game in a WebView.
 * - immersive mode (system bars hidden, swipe to show them briefly)
 * - screen kept on while the game is open
 * - WebView renderer crash: reload the game instead of crashing the app
 */
public class MainActivity extends BridgeActivity {
    private static final String TAG = "Fotwa";
    private static final String BG = "#0b0a10";
    private boolean configured = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        goImmersive();
        getWindow().getDecorView().post(this::setupWebView);
    }

    private void goImmersive() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) goImmersive();
    }

    private void setupWebView() {
        if (configured || isFinishing() || isDestroyed()) return;
        Bridge bridge = getBridge();
        WebView wv = bridge != null ? bridge.getWebView() : null;
        if (wv == null) { getWindow().getDecorView().postDelayed(this::setupWebView, 100); return; }
        try {
            wv.setBackgroundColor(Color.parseColor(BG));
            wv.setOverScrollMode(View.OVER_SCROLL_NEVER);
            WebSettings s = wv.getSettings();
            s.setMediaPlaybackRequiresUserGesture(false);
            s.setDomStorageEnabled(true);
            s.setTextZoom(100);
            s.setAllowFileAccess(false);
            s.setGeolocationEnabled(false);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) s.setSafeBrowsingEnabled(false);
            bridge.setWebViewClient(new BridgeWebViewClient(bridge) {
                @Override
                public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                    Log.e(TAG, "WebView renderer gone; reloading");
                    try { if (view != null) view.stopLoading(); } catch (Exception ignored) {}
                    getWindow().getDecorView().postDelayed(() -> { try { if (getBridge() != null && !isFinishing()) getBridge().reload(); } catch (Exception ignored) {} }, 300);
                    return true;
                }
            });
            configured = true;
        } catch (Exception e) {
            Log.e(TAG, "WebView setup failed: " + e.getMessage(), e);
        }
    }
}
