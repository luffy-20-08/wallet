package com.wallet.tracker;

import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebView;

import androidx.core.content.FileProvider;

import com.getcapacitor.BridgeActivity;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.util.List;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "WalletShare";
    private String pendingSharePayload = null;
    private OcrPipeline ocrPipeline;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        ocrPipeline = new OcrPipeline(this);

        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.clearCache(true);
            webView.addJavascriptInterface(new AndroidNativeExportInterface(), "AndroidNativeExport");
        }

        Intent intent = getIntent();
        if (intent != null) {
            handleIncomingIntent(intent);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (intent != null) {
            handleIncomingIntent(intent);
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (ocrPipeline != null) {
            ocrPipeline.shutdown();
        }
    }

    /**
     * Inspect intent and extract shared text or shared payment screenshot
     */
    private void handleIncomingIntent(Intent intent) {
        String action = intent.getAction();
        String type = intent.getType();

        if (!Intent.ACTION_SEND.equals(action)) {
            return;
        }

        Log.d(TAG, "Incoming Share Intent: action=" + action + ", type=" + type);

        // Check if there is an image stream first (even if type is */* or multipart)
        Uri imageUri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
        if (imageUri == null) {
            ClipData clipData = intent.getClipData();
            if (clipData != null && clipData.getItemCount() > 0) {
                imageUri = clipData.getItemAt(0).getUri();
            }
        }

        if (imageUri != null) {
            handleSharedImage(intent, imageUri);
        } else if (type != null && type.startsWith("text/")) {
            handleSharedText(intent);
        } else {
            // Check if there is plain text in extra even if type is generic
            String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (sharedText != null && !sharedText.trim().isEmpty()) {
                handleSharedText(intent);
            }
        }
    }

    /**
     * Handle incoming shared text (e.g. PhonePe transaction completion share)
     */
    private void handleSharedText(Intent intent) {
        String sharedText = intent.getStringExtra(Intent.EXTRA_TEXT);
        String sharedSubject = intent.getStringExtra(Intent.EXTRA_SUBJECT);

        if (sharedText == null || sharedText.trim().isEmpty()) {
            CharSequence textChars = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
            if (textChars != null) {
                sharedText = textChars.toString();
            }
        }

        if (sharedText == null || sharedText.trim().isEmpty()) {
            ClipData clipData = intent.getClipData();
            if (clipData != null && clipData.getItemCount() > 0) {
                CharSequence textChars = clipData.getItemAt(0).getText();
                if (textChars != null) {
                    sharedText = textChars.toString();
                }
            }
        }

        if (sharedText == null) sharedText = "";

        Log.i(TAG, "=== RAW SHARED TEXT RECEIVED ===\n" + sharedText + "\n=== END RAW SHARED TEXT ===");

        try {
            JSONObject payload = new JSONObject();
            payload.put("type", "text");
            payload.put("text", sharedText);
            payload.put("subject", sharedSubject != null ? sharedSubject : "");
            payload.put("source", "android_share_intent");
            payload.put("timestamp", System.currentTimeMillis());

            sendSharePayloadToWeb(payload.toString());
        } catch (Exception e) {
            Log.e(TAG, "Error constructing text payload", e);
        }
    }

    /**
     * Handle incoming payment screenshot/image using robust multi-pass ML Kit OCR pipeline
     */
    private void handleSharedImage(Intent intent, Uri imageUri) {
        // Also check if any text/caption was shared alongside the image
        String accompanyingText = intent.getStringExtra(Intent.EXTRA_TEXT);
        if (accompanyingText == null || accompanyingText.trim().isEmpty()) {
            CharSequence textChars = intent.getCharSequenceExtra(Intent.EXTRA_TEXT);
            if (textChars != null) accompanyingText = textChars.toString();
        }

        final String finalAccompanyingText = accompanyingText != null ? accompanyingText.trim() : "";
        Log.i(TAG, "Processing shared image URI: " + imageUri + ", Accompanying Text: " + finalAccompanyingText);

        ocrPipeline.processScreenshot(imageUri, finalAccompanyingText, new OcrPipeline.OcrCallback() {
            @Override
            public void onCompleted(JSONObject richPayload) {
                try {
                    sendSharePayloadToWeb(richPayload.toString());
                } catch (Exception e) {
                    Log.e(TAG, "Error sending OCR payload to web", e);
                }
            }

            @Override
            public void onError(Exception error) {
                Log.e(TAG, "OCR Pipeline error, falling back to minimal payload", error);
                try {
                    JSONObject fallback = new JSONObject();
                    fallback.put("type", "image");
                    fallback.put("text", finalAccompanyingText);
                    fallback.put("source", "android_share_fallback");
                    fallback.put("timestamp", System.currentTimeMillis());
                    fallback.put("error", error.getMessage());
                    sendSharePayloadToWeb(fallback.toString());
                } catch (Exception ignored) {}
            }
        });
    }

    /**
     * Deliver JSON payload to Wallet JavaScript application via evaluateJavascript
     */
    private void sendSharePayloadToWeb(final String jsonPayload) {
        runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                    if (webView != null) {
                        // Deliver directly to window.handleWalletShareIntent or queue in window.__pendingShareIntent
                        String script = "if (window.handleWalletShareIntent && document.getElementById('import-amount')) { " +
                                "    window.handleWalletShareIntent(" + jsonPayload + "); " +
                                "} else { " +
                                "    window.__pendingShareIntent = " + jsonPayload + "; " +
                                "}";
                        webView.evaluateJavascript(script, new ValueCallback<String>() {
                            @Override
                            public void onReceiveValue(String value) {
                                Log.d(TAG, "Share payload delivered to WebView: " + value);
                            }
                        });
                    } else {
                        pendingSharePayload = jsonPayload;
                    }
                } catch (Exception e) {
                    Log.e(TAG, "Error delivering share payload to web", e);
                    pendingSharePayload = jsonPayload;
                }
            }
        });
    }

    @Override
    public void onResume() {
        super.onResume();
        WebView webView = getBridge() != null ? getBridge().getWebView() : null;
        if (webView != null) {
            webView.addJavascriptInterface(new AndroidNativeExportInterface(), "AndroidNativeExport");
        }

        if (pendingSharePayload != null) {
            sendSharePayloadToWeb(pendingSharePayload);
            pendingSharePayload = null;
        }
    }

    /**
     * Native Android Export Interface
     * Directly saves generated export files to app cache and triggers Android Chooser
     * with granted read permissions and exact MIME type.
     */
    public class AndroidNativeExportInterface {
        @JavascriptInterface
        public String saveAndShareFile(String fileName, String base64Data, String mimeType, String dialogTitle) {
            try {
                Log.d(TAG, "AndroidNativeExport: saveAndShareFile: " + fileName + ", mime: " + mimeType);
                if (base64Data == null || base64Data.trim().isEmpty()) {
                    return new JSONObject().put("success", false).put("error", "Empty base64 data received").toString();
                }

                String cleanBase64 = base64Data.trim();
                if (cleanBase64.contains(",")) {
                    cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
                }

                byte[] fileBytes = Base64.decode(cleanBase64, Base64.DEFAULT);
                if (fileBytes == null || fileBytes.length == 0) {
                    return new JSONObject().put("success", false).put("error", "Decoded file bytes is 0").toString();
                }

                File cacheDir = getCacheDir();
                File exportDir = new File(cacheDir, "exports");
                if (!exportDir.exists()) {
                    exportDir.mkdirs();
                }

                File outFile = new File(exportDir, fileName);
                FileOutputStream fos = new FileOutputStream(outFile);
                fos.write(fileBytes);
                fos.flush();
                fos.close();

                Log.i(TAG, "AndroidNativeExport: Saved " + outFile.length() + " bytes to " + outFile.getAbsolutePath());

                Uri contentUri = FileProvider.getUriForFile(
                    MainActivity.this,
                    getPackageName() + ".fileprovider",
                    outFile
                );

                Log.i(TAG, "AndroidNativeExport: FileProvider content URI: " + contentUri);

                Intent sendIntent = new Intent(Intent.ACTION_SEND);
                String resolvedMime = (mimeType != null && !mimeType.trim().isEmpty()) ? mimeType.trim() : "application/pdf";
                sendIntent.setType(resolvedMime);
                sendIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                sendIntent.putExtra(Intent.EXTRA_SUBJECT, fileName);
                sendIntent.setClipData(ClipData.newRawUri(fileName, contentUri));
                sendIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                Intent chooser = Intent.createChooser(sendIntent, dialogTitle != null ? dialogTitle : "Export: " + fileName);
                chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);

                // Grant explicit URI read permissions to all apps matching the chooser
                List<ResolveInfo> resInfoList = getPackageManager().queryIntentActivities(chooser, PackageManager.MATCH_DEFAULT_ONLY);
                for (ResolveInfo resolveInfo : resInfoList) {
                    String targetPackage = resolveInfo.activityInfo.packageName;
                    grantUriPermission(targetPackage, contentUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                }

                startActivity(chooser);

                JSONObject res = new JSONObject();
                res.put("success", true);
                res.put("uri", contentUri.toString());
                res.put("path", outFile.getAbsolutePath());
                res.put("size", outFile.length());
                return res.toString();
            } catch (Exception e) {
                Log.e(TAG, "AndroidNativeExport exception", e);
                try {
                    return new JSONObject().put("success", false).put("error", e.getMessage() != null ? e.getMessage() : e.toString()).toString();
                } catch (Exception ignored) {
                    return "{\"success\":false,\"error\":\"" + e.getMessage() + "\"}";
                }
            }
        }
    }
}
