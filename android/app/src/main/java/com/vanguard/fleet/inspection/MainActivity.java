package com.vanguard.fleet.inspection;

import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Configure window to respect system bars
        // Keep default behavior (don't draw behind system bars) and make status bar transparent
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            // Make status bar transparent
            getWindow().setStatusBarColor(android.graphics.Color.TRANSPARENT);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                // Android 11+ (API 30+) - Use modern WindowInsets API
                WindowInsetsControllerCompat windowInsetsController = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
                if (windowInsetsController != null) {
                    // Make status bar icons light (for dark backgrounds)
                    windowInsetsController.setAppearanceLightStatusBars(false);
                }
            } else {
                // Android 5.0-10 (API 21-29) - Use legacy flags
                // Keep layout stable - don't draw behind status bar
                getWindow().getDecorView().setSystemUiVisibility(
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                );
            }
        }
        
        // Expose minimize method to JavaScript
        // Note: bridge.getWebView() is available after onCreate completes
        // We'll set this up in onStart or use a post-delay
        getWindow().getDecorView().post(new Runnable() {
            @Override
            public void run() {
                if (bridge != null && bridge.getWebView() != null) {
                    bridge.getWebView().addJavascriptInterface(new Object() {
                        @android.webkit.JavascriptInterface
                        public void minimize() {
                            runOnUiThread(() -> {
                                moveTaskToBack(true);
                            });
                        }
                    }, "AndroidMinimize");
                }
            }
        });
    }
}
